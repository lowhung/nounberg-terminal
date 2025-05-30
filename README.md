# Nounberg Terminal

A real‑time Nouns DAO auction tracker that **indexes** on‑chain events, **enriches** them with off‑chain context,
produces concise human‑readable headlines, and serves both a paginated REST feed and a live WebSocket stream—all
bootstrapped by a single `make start`.

---

## 🏗️ Architecture Overview

*Diagram shows event flow and external integrations; each service is detailed below.*

### Services

| Package                            | Tech Stack                   | Responsibility                                                                                                                                                                                                                                      | Notable Features                                                                                                                                                                                           |
|------------------------------------|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Indexer** (`packages/indexer`)   | Ponder (TypeScript)          | Streams `AuctionCreated`, `AuctionBid`, `AuctionSettled` from main‑net and writes a **base event** row keyed by the on‑chain `event.id`.                                                                                                            | • Re‑org rollback via Ponder hooks• Built‑in GraphQL explorer at `:42069`• `ON CONFLICT` safeguard in case of duplicate or rolled‑back logs• Enqueues enrichment jobs after insert                         |
| **Queue** (`packages/queue`)       | BullMQ + Redis               | Receives enrichment jobs; exposes Prometheus metrics & `/health`.                                                                                                                                                                                   | • Lock‑manager sets prevent duplicate ENS / price cache fetches• Completed jobs are **immediately removed** to keep Redis lean during spikes (configurable retention window if forensic traces are needed) |
| **Workers** (`packages/queue`)     | BullMQ worker pool (Node TS) | Fetches jobs, enriches with USD price, ENS, thumbnail, and headline, then **GETs + UPDATEs** the event row (no upsert). Inserts are left solely to the Indexer so Ponder can manage rollbacks; if the row isn’t present yet the job simply retries. | • Redis cache (48 h ENS, 1 h price) behind lock‑manager keys so only one worker populates a miss• Alchemy historical price API• Thumbnails via `https://noun.pics/{nounId}`                                |
| **API** (`packages/api`)           | Hono.js                      | Cursor‑based REST `/api/events` and WebSocket `/ws`; relays Postgres `LISTEN/NOTIFY`.                                                                                                                                                               | • Single service handles HTTP + WS for PoC; for prod a dedicated realtime gateway is preferred• **No OpenAPI docs**—endpoint schema described in README                                                    |
| **Frontend** (`packages/frontend`) | React + TailwindCSS          | Lets users: (1) watch the live stream, (2) **scroll forward** through history via cursor pagination, (3) filter by event type or noun ID.                                                                                                           | –                                                                                                                                                                                                          |
| **Datastores**                     | PostgreSQL / Redis           | Truth store and cache/queue backend.                                                                                                                                                                                                                | Triggers emit `NOTIFY auction_events` used by API.                                                                                                                                                         |

---

## 📂 Data Model

All events reside in a single **`auction_events`** table keyed by the \*\*on‑chain \*\***`event_id`** (transaction
hash + log index, exposed by Ponder as `event.id`). Columns:

| column            | type        | purpose                          |
|-------------------|-------------|----------------------------------|
| `event_id`        | text PK     | deterministic unique id from log |
| `event_type`      | enum        | `created`, `bid`, `settled`      |
| `block_timestamp` | timestamptz | used for cursor pagination       |
| `headline`        | text        | human string                     |
| …                 | …           | other enrichment fields          |

**Why denormalise?**

* The feed is consumed chronologically; explicit columns (many nullable) avoid costly joins or unions.
* Cursor pagination using `block_timestamp DESC, event_id DESC` remains stable even while new rows stream in.
* Updates are simple `UPDATE … WHERE event_id = ?`—no race with inserts.

If analytical or relational queries grow, a normalised shadow schema or materialised view can be built without touching
the hot path.

**Indexes in use**(defined via Ponder):

* `block_timestamp` (single‑column) — drives cursor pagination.
* `type`, `nounId` (single‑column) — quick filters in the REST endpoint.
* Compound indexes: `(type, block_timestamp)`, `(nounId, block_timestamp)`, `(type, nounId, block_timestamp)` — cover
  the common “show bids for noun #721” and similar queries.

Full schema lives in `packages/indexer/ponder/schema.ts`; trimmed here for readability.

---

## 🗄️ Caching Strategy & Lock Management

| Item          | TTL                                                                                   | Lock Key Example        |
|---------------|---------------------------------------------------------------------------------------|-------------------------|
| ENS name      | 48 h                                                                                  | `lock:ens:0xd8dA6B…`    |
| ETH/USD price | ≤ 1 h old → **24 h TTL**<br>1 h – 24 h old → **7 d TTL**<br>＞ 24 h old → **30 d TTL** | `lock:price:<hour-iso>` |

Workers acquire a **Redis `SETNX` lock** before external look‑ups; the first worker populates the cache, others read the
cached value—eliminating duplicate calls without heavy coordination.

> **Future optimisation:** `SETNX` is simple but single‑instance. For multi‑node resilience we could switch to
> a [Redlock](https://redis.io/docs/interact/locks/)‑style algorithm or use a small Lua script that performs “get or fetch
> then set” atomically.

---

## 🔄 End‑to‑End Flow

1. **Detect**— Indexer writes base row keyed by `event_id`.
2. **Enqueue**— Job submitted to BullMQ.
3. **Lock & Fetch**— Worker locks ENS/price keys and fetches as needed.
4. **Update**— Worker `UPDATE`s row with enrichment (no UPSERT needed because row already exists).
5. **Notify**— `NOTIFY auction_events` with `event_id`.
6. **Broadcast**— API pushes JSON to WebSocket clients; REST reflects immediately.

---

## 🚀 Quick Start

```bash
# Prepare env
cp .env.example .env
# add PONDER_RPC_URL_1 and ALCHEMY_API_KEY

make start                 # build & launch full stack
```

| URL                      | Purpose                        |
|--------------------------|--------------------------------|
| `http://localhost:8080`  | Frontend demo (live & history) |
| `http://localhost:3000`  | REST API                       |
| `ws://localhost:3000/ws` | WebSocket feed                 |
| `http://localhost:42069` | Ponder GraphQL explorer        |

---

## 📡 API Reference

### GET `/api/events`

```http
GET /api/events?cursor=2025‑05‑29T16:0xabc…&limit=20&type=bid&nounId=721
```

*Query params*

* `cursor` — opaque string `block_timestamp:event_id`
* `limit`— up to 100
* `type`— optional `created|bid|settled`
* `nounId`— optional filter

Returns newest‑first events; exact JSON schema is documented inline in code.

### WebSocket `/ws`

```jsonc
// Client → Server
{ "type": "subscribe", "filters": { "nounId": 721 } }

// Server → Client
{ "type": "event", "data": { /* event object */ } }
```

### Health Endpoints

```
GET /api/health        # API liveness
GET /queue/health      # Queue & worker pool
```

---

## 🧪 Testing with Foundry

Top‑level `make test` orchestrates:

1. **start‑anvil** — mainnet fork.
2. **deploy** — deploys test contracts + simulates auction.
3. **test‑ponder** — asserts indexer/worker output.

Makefile snippets are included below for reference.

---

## 🧠 Architectural Notes & Take‑aways

### Blockchain Tooling

* **Foundry (Forge + Anvil)** delivers quick, repeatable mainnet‑fork tests—something absent in Cardano’s tool‑chain and
  a huge velocity boost when validating complex auction flows.
* **Open ABIs (Etherscan, Sourcify)** mean event signatures and calldata layouts are one search away, so log‑decoding
  and debugging are markedly faster than in ecosystems where contract interfaces are opaque.

### Service Boundaries

* **Dedicated API vs Indexer**— REST/WebSocket traffic runs in its own process while chain ingestion remains isolated;
  this separation simplifies scaling decisions (CPU for workers, I/O for API) and keeps failure domains narrow.
* **Worker isolation**— Enrichment is CPU‑bound and parallel‑friendly; running it in a discrete container group lets
  Kubernetes HPA scale based on queue depth without impacting request latency on the API.

### Internal Communication

* **Why gRPC (future)**— Strongly‑typed protobuf contracts and efficient streaming are ideal once service count grows.
  Drawbacks: schema evolution rules (append‑only fields) and CI plumbing to regenerate types. REST is fine for the
  current two‑hop topology, but a migration path is planned.

### Real‑Time Delivery

* **PostgreSQL LISTEN/NOTIFY** ensures notifications fire only after the row is committed—no dual‑write race that
  sometimes occurs with Redis Pub/Sub.
* **WebSocket in Hono vs dedicated gateway** — Hono’s WS support works but needs explicit upgrade handling. For
  production, a separate realtime service (Fastify, native `ws`, uWebSockets.js) would simplify long‑lived connection
  management and keep the REST layer stateless.
* **Stateful connections** — The API process currently holds all active WebSocket clients in memory. That works for a
  single‑instance PoC, but horizontal scaling would require either sticky sessions **or** an external broker (e.g.,
  Redis Pub/Sub, NATS) so any replica can broadcast to all clients.
* WebSocket chosen over SSE for bidirectional features (future auth/filter commands). Rate‑limiting and per‑user filters
  are on the roadmap.

### Upsert vs Update

* **Current flow:** Indexer performs the insert via Ponder’s Store API, which buffers writes in‑memory during historical
  sync and flushes them to PostgreSQL with COPY—fast and re‑org‑safe. Workers then issue parameterised UPDATEs to append
  enrichment. This keeps insert logic in one place—the component that understands rollbacks—and avoids cross‑service
  contention.

* **Scaling:** In production, more worker replicas (Docker Compose ▶ --scale workers=N, ECS service, etc.) consume the
  same queue. Because every job ultimately resolves to a single UPDATE, contention is minimal and database locks remain
  short‑lived. BullMQ’s batch jobs / pipelines can further boost throughput by letting each worker acknowledge multiple
  completed jobs in one round‑trip.

* **Why not use Store API in workers?**  Store API is part of Ponder’s runtime and only available inside its hooks; the drizzle it exposes is read-only. The
  workers run as a standalone Node service with their own connection pool. They therefore use parameterised raw SQL,
  which also keeps transaction boundaries explicit and straightforward.

* **Future improvement:** Introduce a small type‑safe query helper (e.g., wrapping pg with Zod schemas) or migrate to an
  ORM such as Drizzle once it supports LISTEN/NOTIFY. This would align typing across services without pulling in the
  Ponder‑specific Store API, which as mentioned above is unavailable outside the Indexer context.

### Observability

* **Prometheus metrics** already exposed by Indexer and Queue/Worker; dashboards live under `monitoring/`. API metrics
  will be added after the WebSocket refactor.
* **Structured logging** — Plan to extract a shared `@nounberg/logger` (pino wrapper, similar to Ponder’s internal
  logger) so every service outputs JSON logs with trace/context fields, making aggregation in Loki or Elasticsearch
  straightforward.

## 🔮 Future Work

* **EIP‑4361 (Sign‑In with Ethereum)** for authenticated WebSocket streams.
* Migrate internal REST to **gRPC**.
* Implement request‑level **rate‑limiting** once auth is in place.
* Extract shared libs (`@nounberg/logger`, types, SQL) into workspace package.
* Seed full historical ETH price table or run internal oracle.

---

## 🛠 Makefile Commands

Below are the **user‑facing commands** you’ll run most often; full recipes are in each Makefile.

| Command             | Mode     | What it does                                                                               |
|---------------------|----------|--------------------------------------------------------------------------------------------|
| `make start`        | **Prod** | Build and launch the complete stack (all services + infra)                                 |
| `make dev`          | **Dev**  | Spin up Postgres & Redis only; you then run one or more `make dev‑<service>` targets below |
| `make dev-indexer`  | **Dev**  | Start the indexer with live‑reload, relying on the shared infra from `make dev`            |
| `make dev-api`      | **Dev**  | Start the REST + WebSocket API                                                             |
| `make dev-workers`  | **Dev**  | Launch the worker pool & queue API                                                         |
| `make dev-frontend` | **Dev**  | Start the React front‑end (Vite dev server)                                                |
| `make test`         | **Test** | End‑to‑end Foundry run (fork mainnet, deploy contracts, assert indexing)                   |
| `make stop`         | —        | Bring down all running containers                                                          |
| `make clean`        | —        | Stop containers and prune Docker artifacts                                                 |

For contract‑level tests the **Foundry Makefile** offers:

| Command            | Purpose                                                            |
|--------------------|--------------------------------------------------------------------|
| `make start-anvil` | Spin up an Anvil mainnet fork (side stack)                         |
| `make deploy`      | Build a small deployer image and simulate a complete auction cycle |
| `make test-ponder` | Run Ponder against that fork and verify events                     |
| `make test`        | Shortcut: `start-anvil ➜ deploy ➜ test-ponder`                     |

