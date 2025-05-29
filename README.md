# Nounberg Terminal

A real-time Nouns DAO auction tracking service that indexes blockchain events, enriches them with off-chain data, generates human-readable headlines, and delivers them via REST API and WebSocket streams.

## 🏗️ Architecture Overview

![Nounberg Terminal Architecture](./nounberg-excalidraw.png)

*Simple architecture diagram showing data flow between services, external API integrations, and caching relationships.*

## 🐳 Services

### **Indexer** (`packages/indexer`)
- **Technology**: Ponder (TypeScript blockchain indexer)
- **Purpose**: Listens for `AuctionCreated`, `AuctionBid`, and `AuctionSettled` events from the Nouns AuctionHouse contract
- **Contract**: `0x830BD73E4184cef73443C15111a1DF14e495C706` on Ethereum mainnet
- **Features**:
   - Automatic blockchain reorganization handling (through conflict resolution on sql + rollback of inserts)
   - Built-in GraphQL API at `:42069`
   - Submits enrichment jobs to the queue after storing basic event data

### **Queue** (`packages/queue`)
- **Technology**: BullMQ + Redis
- **Purpose**: Manages background job processing for event enrichment
- **API Endpoints**:
   - `POST /api/jobs/enrich-event` - Submit new enrichment jobs
   - `GET /health` - Health check endpoint
- **Features**: Job deduplication, retry logic, and monitoring

### **Workers** (`packages/queue`)
- **Technology**: BullMQ workers with Redis caching + requests to external APIs for enrichment
- **Purpose**: Enriches auction events with ENS names, USD prices, and human-readable headlines
- **Data Connections**:
   - Redis for caching ENS names and price data + queue management
   - PostgreSQL for reading/updating auction events
- **Enrichment Tasks**:
   - 💰 **Price Data**: Converts ETH to USD using Alchemy historical price API
   - 🏷️ **ENS Resolution**: Resolves Ethereum addresses to ENS names
   - 🖼️ **Thumbnails**: Generates Noun thumbnail URLs (`https://noun.pics/{nounId}`)
   - 📰 **Headlines**: Creates human-readable summaries (e.g., "Noun #721 sold for 69.42 Ξ ($248,000) to vitalik.eth")
- **Caching Strategy**:
   - ENS names: 48 hours (users can transfer ownership of ENS names to a different address)
   - ETH prices: 15 minutes (recent) to 30 days (historical). Rational is that ETH prices are immutable historical data, so they can be pre-seeded into the cache.

### **API** (`packages/api`)
- **Technology**: Hono (just like Ponder for consistency)
- **Purpose**: Serves enriched auction data via paginated API and WebSocket
- **Data Source**: PostgreSQL database
- **Endpoints**:
   - `GET /api/events` - Paginated auction events (cursor-based pagination)
   - `GET /api/health` - Service health check
   - `WS /ws` - Real-time event streaming (very generic name but works for now)
- **Features**:
   - Using cursor-based pagination as this is more efficient for large datasets and avoids issues with offset pagination (e.g., missing or duplicate records when new events are added)
   - Real-time WebSocket notifications using PostgreSQL LISTEN/NOTIFY -> broadcasts new events to connected clients

### **Frontend** (`packages/frontend`)
- **Technology**: React + TailwindCSS
- **Purpose**: Web interface for viewing auction data
- **Features**:
   - Real-time auction event feed
   - Paginated historical view when filtering by event type or noun ID
   - WebSocket connection for live updates

### **Infrastructure**
- **PostgreSQL**: Primary database for auction events (accessed by Indexer, API, and Workers)
- **Redis**: Caching layer for Workers and BullMQ job queue backend

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Ethereum RPC URL (Alchemy, etc.)

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your RPC URL
PONDER_RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
```

### 2. Start the Full Stack

```bash
# Build and start all services
make start

# Or for development with individual control
make dev              # Start infrastructure (postgres, redis)
make dev-indexer      # Start blockchain indexer
make dev-workers      # Start background workers  
make dev-api          # Start API server
make dev-frontend     # Start frontend
```

### 3. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:8080 | Web interface |
| **API** | http://localhost:3000 | REST API + WebSocket |
| **API Docs** | http://localhost:3000/docs | OpenAPI documentation |
| **Ponder GraphQL** | http://localhost:42069 | Blockchain data queries |
| **WebSocket** | ws://localhost:3000/ws | Real-time events |

## 📡 API Reference

### Paginated Events
```http
GET /api/events?offset=0&limit=10&type=bid
```

**Response:**
```json
{
  "data": [
    {
      "id": "0x123abc..._45",
      "type": "bid",
      "nounId": 721,
      "bidder": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "bidderEns": "vitalik.eth",
      "value": "69420000000000000000",
      "valueUsd": 248000,
      "headline": "Bid placed on Noun #721 for 69.42 Ξ ($248,000) by vitalik.eth",
      "thumbnailUrl": "https://noun.pics/721",
      "blockNumber": 18500000,
      "blockTimestamp": 1698789012,
      "createdAt": 1698789012,
      "processedAt": 1698789015,
    }
  ],
  "count": 1,
  "offset": 0
}
```

### Real-time WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

// Subscribe to events
ws.send(JSON.stringify({ type: 'subscribe' }));

// Receive real-time events
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'event') {
    console.log('New auction event:', data);
  }
};
```

## 🧪 Testing

### End-to-End Testing with Foundry

The project includes a testing approach using Foundry + Anvil for local blockchain simulation:

```bash
# Navigate to indexer package
cd packages/indexer

# Run full test suite (starts anvil, deploys contracts, simulates auctions)
make test

# Individual steps
make start-anvil    # Start local blockchain
make deploy         # Deploy contracts & simulate auction cycle
make test-ponder    # Test event indexing
make clean          # Cleanup
```

**Test Flow:**
1. **Anvil Fork**: Spins up a forked mainnet at block 19258213
2. **Contract Deployment**: Deploys test contracts and simulates a complete auction cycle
3. **Event Generation**: Creates `AuctionCreated`, `AuctionBid`, and `AuctionSettled` events
4. **Indexing Verification**: Confirms Ponder correctly indexes all generated events

## 🧠 Architectural Learnings & Design Decisions

### **Blockchain Development Tooling**

**ABIs and Contract Introspection**: Contract ABIs are widely available across platforms, making Etherscan invaluable for contract introspection, understanding transaction receipts with logs, and debugging event emissions. The transparency of Ethereum's ecosystem significantly accelerates development compared to more opaque blockchain environments.

**Foundry's Forge + Anvil**: An exceptional testing combination that's unmatched in other blockchain ecosystems (notably absent in Cardano's dev toolkit). Anvil's ability to fork mainnet at any block height and simulate complex transaction flows makes end-to-end testing feasible and reliable. This enabled comprehensive testing of auction cycles without waiting for real blockchain events.

### **Service Architecture Decisions**

**Ponder vs Standalone API**: While Ponder provides a built-in `serve` command for API functionality, I chose a standalone API service for clear separation of concerns. This architecture isolates indexer logic from API logic, even though both services connect to PostgreSQL. Benefits include:
- Independent scaling of indexing vs API serving
- Different deployment lifecycles (indexer requires blockchain connectivity, API focuses on request handling)
- Cleaner codebase organization with focused responsibilities

**Workers Separated from Queue**: Rather than embedding worker logic in the queue service (which could clog the event loop), workers run as separate processes. This "sandboxed" approach enables:
- **Independent Scaling**: Scale worker processes through threading, concurrency, or container replication
- **Cloud Auto-scaling**: Deploy workers with auto-scaling policies (ECS, Kubernetes HPA) based on queue depth
- **Fault Isolation**: Worker crashes don't affect job queuing, and vice versa
- **Resource Optimization**: Workers can be CPU-optimized while queue API can be memory-optimized

### **Data Architecture Choices**

**Single Events Table vs. Normalized Schema**: Instead of highly normalized tables (separate `Bids`, `Settlements`, `Creations` tables), I chose a unified `auction_events` table. The normalized approach would make API requests and WebSocket responses cumbersome, requiring complex joins or multiple queries. A single table with event-type discrimination provides:
- **Consistent API Responses**: Same data structure regardless of event type
- **Simplified Pagination**: Single cursor-based pagination across all event types
- **Efficient Real-time Updates**: WebSocket can broadcast uniform event objects
- **Cleaner Frontend Logic**: No need to handle different object shapes

**Cursor vs Offset Pagination**: Cursor-based pagination is superior for this use case because:
- **Consistency During Growth**: New events don't shift offset positions, preventing duplicate/missed records
- **Database Efficiency**: Uses indexed fields (block_number, log_index) rather than expensive `OFFSET` operations
- **Real-time Compatibility**: Cursors work seamlessly with live data streams
- **Scale Performance**: `OFFSET 10000` scans and skips 10k records; cursor pagination uses index seeks

### **Caching Strategy**

**Price Data Optimization**: ETH price data is rounded to hourly intervals to reduce API calls and increase cache hit rates. However, for production systems, I'd recommend maintaining a complete historical price database since historical prices never change. Ideally, this data would be pre-seeded into the cache, eliminating API dependencies for historical price lookups.

**Cache TTL Strategy**:
- **ENS Names**: 48-hour TTL (ENS names change infrequently)
- **Recent ETH Prices**: 15-minute TTL (active price movement)
- **Historical ETH Prices**: 30-day TTL (immutable historical data)

### **Monorepo Challenges**

**Package Management Complexity**: Attempted to implement monorepo package management but found it required "quantum physics level intellect" to handle Docker Compose with cross-image dependency management. The complexity of sharing dependencies between services while maintaining separate Docker build contexts proved problematic.

**Future Improvements**: Would ideally extract shared libraries (logger, database schemas, type definitions) into common packages. This would reduce code duplication and ensure consistency across services, but requires sophisticated build tooling (Lerna, Rush, or custom Docker multi-stage builds).

### **Real-time Architecture**

**PostgreSQL LISTEN/NOTIFY**: Chose database-driven notifications over Redis pub/sub for real-time WebSocket updates because:
- **Data Consistency**: Notifications fire exactly when data is committed to the database
- **Single Source of Truth**: No synchronization issues between database state and notification state
- **Simplified Architecture**: Eliminates need for separate pub/sub infrastructure
- **Atomic Operations**: Database writes and notifications happen in the same transaction

### **Technology Stack Rationale**

**BullMQ over Alternatives**: Redis-based job queue with excellent observability, retry logic, and scaling characteristics. Superior to database-based queues for high-throughput scenarios.

**TypeScript Throughout**: Full type safety across all services prevents runtime errors and improves maintainability, especially important in distributed systems where interface contracts matter.

---

## 🏛️ Key Architecture Decisions

### **Microservices with Docker**
- Each service runs in isolation with clear boundaries
- Independent scaling and deployment capabilities
- Docker Compose orchestration for development and production

### **Two-Phase Event Processing**
1. **Immediate**: Ponder stores basic event data in PostgreSQL for fast retrieval
2. **Enrichment**: Background workers asynchronously add USD prices, ENS names, and headlines

### **Robust Caching Strategy**
- **ENS Resolution**: 48-hour TTL (ENS names rarely change)
- **Price Data**: Variable TTL (15 min for recent, 30 days for historical)
- **Redis**: Distributed caching across worker instances

### **Real-time Architecture**
- **PostgreSQL LISTEN/NOTIFY**: Efficient database-driven notifications
- **WebSocket Streaming**: Real-time event delivery to connected clients
- **Cursor Pagination**: Efficient handling of large datasets

### **Blockchain Reliability**
- **Ponder Framework**: Handles complex reorg scenarios automatically
- **Idempotent Operations**: All database operations prevent duplicates
- **Starting Block**: Optimized starting block (19258213) for efficient syncing

## 🔄 Data Flow

1. **Event Detection**: Ponder detects new auction events on Ethereum
2. **Initial Storage**: Basic event data stored in PostgreSQL
3. **Job Queue**: Enrichment job submitted to BullMQ via Queue API
4. **Background Processing**: Workers enrich events by:
   - Reading event data from PostgreSQL
   - Checking Redis cache for ENS names and price data
   - Fetching missing data from external APIs (Alchemy for prices, ENS provider for names)
   - Caching results in Redis for future use
   - Generating human-readable headlines
5. **Database Update**: Workers store enriched data back to PostgreSQL
6. **Real-time Notification**: PostgreSQL NOTIFY triggers WebSocket broadcast via API
7. **Client Delivery**: Frontend receives real-time updates from API via WebSocket

## 📊 Monitoring & Health

### Health Check Endpoints
- **API**: `GET /api/health`
- **Queue**: `GET :3001/health`
- **Individual Services**: `make health`

### Service Monitoring
```bash
make status         # Service status overview
make logs          # Follow all service logs
make logs-api      # Service-specific logs
```

### Performance Metrics
- **Database**: Standard PostgreSQL monitoring
- **Redis**: Built-in Redis monitoring tools
- **Queue**: BullMQ dashboard and metrics endpoints

## 🛠️ Development

### Available Commands
```bash
make help           # Show all available commands
make dev            # Start infrastructure only
make dev-indexer    # Start indexer service
make dev-api        # Start API service  
make dev-workers    # Start workers service
make dev-frontend   # Start frontend service
make test           # Run full test suite
make clean          # Cleanup containers and images
```

### Package Structure
```
packages/
├── indexer/        # Ponder blockchain indexer
│   ├── ponder/     # Ponder configuration and handlers
│   ├── foundry/    # Testing infrastructure with Foundry
│   └── abis/       # Contract ABIs
├── api/            # Hono.js API server with WebSocket
├── queue/          # BullMQ queue and workers
└── frontend/       # React frontend application
```

## 🚦 Production Deployment

### Environment Variables
```bash
# Required
PONDER_RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_API_KEY=YOUR_ALCHEMY_KEY

# Optional
DATABASE_URL=postgres://user:pass@host:port/db
REDIS_URL=redis://host:port
PORT=3000
```

### Docker Deployment
```bash
# Production stack
make start

# Scale workers for high throughput
docker compose up -d --scale workers=5

# Resource limits are pre-configured in docker-compose.yml
```

## 📄 License

MIT - Feel free to use this project as a reference or starting point for your own blockchain indexing solutions.

---

**Built with**: TypeScript, Ponder, Hono.js, BullMQ, React, PostgreSQL, Redis, Docker