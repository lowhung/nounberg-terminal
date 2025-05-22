# Nounberg Terminal

A service that tracks Nouns DAO auctions, enriches each auction event with extra data, generates human-readable headlines for every auction, and makes those headlines available both in real time and through a paginated historical feed.

## Architecture

The project consists of standalone Docker services that work together to process and serve Nouns auction data.

### 🐳 Services

- **`ponder`** - Blockchain indexer using Ponder to track Nouns AuctionHouse events
- **`api`** - REST API and WebSocket server for serving auction data  
- **`workers`** - Background job processors for data enrichment
- **`frontend`** - React frontend application with nginx
- **`postgres`** - PostgreSQL database for persistent storage
- **`redis`** - Redis for job queues and caching
- **`memcached`** - Additional caching layer

### 🏗️ Data Flow

1. **Ponder** indexes events from Ethereum and stores basic data in PostgreSQL
2. **Workers** enrich events with USD prices, ENS names, and generate headlines
3. **API** serves enriched data via HTTP endpoints and WebSocket streams
4. **Frontend** provides a web interface for viewing auction data

## Quick Start

### Prerequisites

- Docker and Docker Compose  
- Ethereum RPC URL (Alchemy, Infura, etc.)

### Environment Setup

Create a `.env.local` file with your configuration:

```bash
# Ethereum RPC URL (required)
PONDER_RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/your-api-key

# Optional: Server metadata
SERVER_START_TIME=$(date +%s)
APP_VERSION=1.0.0
```

### Development

Start infrastructure services, then application services:

```bash
# Start infrastructure (postgres, redis, memcached)
make dev

# Start all application services
make dev-services

# Or start services individually
make dev-ponder    # Blockchain indexer
make dev-api       # API server  
make dev-workers   # Background workers
make dev-frontend  # Frontend
```

### Production

Build and run everything in Docker:

```bash
# Build and start production stack
make prod

# View logs
make logs

# Stop services
make down
```

## 🛠️ Available Commands

Run `make help` to see all available commands:

### Development Commands
- `make dev` - Start infrastructure services only (postgres, redis, memcached)
- `make dev-services` - Start all application services
- `make dev-ponder` - Start only Ponder service
- `make dev-api` - Start only API service
- `make dev-workers` - Start only workers service
- `make dev-frontend` - Start only frontend service

### Production Commands
- `make prod` - Build and start full production stack
- `make build` - Build all Docker images
- `make up` - Start all services (assumes images are built)
- `make down` - Stop all services
- `make restart` - Restart all services

### Monitoring Commands
- `make logs` - Follow logs for all services
- `make logs-api` - Follow logs for specific service
- `make status` - Show status of all services
- `make health` - Check health of all services

### Utility Commands
- `make clean` - Clean up containers and images
- `make clean-all` - Clean everything including volumes (destructive!)
- `make shell-api` - Get shell access to service
- `make rebuild-workers` - Rebuild and restart specific service

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | REST API and WebSocket |
| **Ponder GraphQL** | http://localhost:42069 | Ponder's built-in GraphQL API |
| **Frontend** | http://localhost:8080 | React web interface |
| **API Documentation** | http://localhost:3000/docs | Swagger/OpenAPI docs |
| **WebSocket** | ws://localhost:3000/ws | Real-time event stream |
| **Health Check** | http://localhost:3000/api/health | Service health status |

## 📡 API Documentation

### Paginated Auction Events

Retrieve auction events with offset-based pagination:

```http
GET /api/events?offset=0&limit=10&type=bid
```

**Parameters:**
- `offset` (optional): Number of events to skip (default: 0)
- `limit` (optional): Number of events per page (default: 10, max: 100)
- `type` (optional): Filter by event type (`created`, `bid`, `settled`)

**Response:**
```json
{
  "data": [
    {
      "id": "0x123abc..._45",
      "type": "bid", 
      "nounId": 721,
      "txHash": "0x123abc...",
      "blockNumber": 18500000,
      "blockTimestamp": 1698789012,
      "logIndex": 45,
      "bidder": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "bidderEns": "vitalik.eth",
      "value": "69420000000000000000",
      "valueUsd": 248000,
      "extended": false,
      "headline": "Bid placed on Noun #721 for 69.42 Ξ ($248,000) by vitalik.eth",
      "thumbnailUrl": "https://noun.pics/721",
      "createdAt": 1698789012,
      "processedAt": 1698789015
    }
    // ... more events
  ],
  "count": 1,
  "offset": 0
}
```

### Individual Event

Get a specific auction event by ID:

```http
GET /api/events/{event-id}
```

**Response:** Single event object (same structure as above)

### Real-time Events via WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates:

1. **Connect** to the WebSocket endpoint
2. **Subscribe** to events:
   ```json
   {"type": "subscribe"}
   ```
3. **Receive** real-time events:
   ```json
   {
     "type": "event",
     "data": {
       // Event data (same structure as REST API)
     }
   }
   ```

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0", 
  "uptime": 3600,
  "database": "connected"
}
```

## 🗄️ Database Setup

The system uses PostgreSQL with the following default configuration:

- **Host:** `postgres` (Docker service name)
- **Port:** `5432`
- **Database:** `nounberg`
- **Username:** `nounberg`
- **Password:** `nounberg`

### Database Schema

- **`auction_events`** - Main events table (managed by Ponder)
- **`auction_jobs`** - Job queue table for background processing

## 🏛️ Architecture Decisions

### **Standalone Docker Services**
- Each service runs in its own container for isolation
- Clear separation of concerns between services
- Independent scaling and deployment capabilities
- Simplified dependency management

### **Ponder for Blockchain Indexing** 
- Handles complex blockchain reorg scenarios automatically
- Built-in GraphQL API for advanced queries
- Robust event processing with retry logic

### **Two-Phase Event Processing**
1. **Immediate:** Basic event data stored via Ponder
2. **Enrichment:** Background workers add USD prices, ENS names, enhanced headlines

### **Caching Strategy**
- **ENS names:** 48 hours (rarely change)
- **ETH prices:** 15 minutes (recent) to 30 days (historical)
- **Memcached** for distributed caching across workers

### **Modern Tech Stack**
- **Hono.js:** Fast, modern web framework
- **WebSockets:** Real-time event streaming  
- **TypeScript:** Full type safety across all services
- **Docker:** Containerized deployment with docker-compose

### **Idempotent Operations**
- All database operations handle duplicates gracefully
- Job queue deduplication prevents duplicate processing
- Handles blockchain reorgs without data corruption

## 🚀 Production Deployment

### Environment Variables

```bash
# Required
PONDER_RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/your-key

# Optional
SERVER_START_TIME=$(date +%s)
APP_VERSION=1.0.0
```

### Docker Deployment

```bash
# Production deployment
make prod

# Scale workers
docker compose up -d --scale workers=5

# View service-specific logs
make logs-api
make logs-workers
make logs-ponder
```

### Health Monitoring

Monitor service health via:
- **API Health:** `GET /api/health` or `make health`
- **Ponder Status:** `GET http://localhost:42069` (GraphQL playground)
- **Service Status:** `make status`
- **Database:** Standard PostgreSQL monitoring
- **Redis:** Standard Redis monitoring tools

## 🔧 Development Tips

### Service Dependencies

Services have the following startup dependencies:
1. **Infrastructure first:** postgres, redis, memcached
2. **Then applications:** ponder → workers, api → frontend

### Debugging Services

```bash
# Get shell access to any service
make shell-api
make shell-workers

# Rebuild a specific service during development
make rebuild-workers
make rebuild-api

# Watch logs for specific services
make logs-ponder
make logs-workers
```

### Local Development vs Production

- **Development:** Use `make dev` + individual service commands for faster iteration
- **Production:** Use `make prod` for full stack deployment

## 📜 License

MIT
