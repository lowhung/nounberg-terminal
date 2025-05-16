# Nounberg Terminal

A service that tracks Nouns DAO auctions, enriches each auction event with extra data, generates human-readable headlines for every auction, and makes those headlines available both in real time and through a paginated historical feed.

## Architecture

The project is split into three main components:

1. **Indexer** - Uses Ponder to index events from the Nouns AuctionHouse contract on Ethereum.
2. **Workers** - Processes events to enrich them with additional data like USD prices and ENS names.
3. **API** - Serves the processed events via HTTP and WebSocket.

All components share a PostgreSQL database for storage and communication.

## Setup

### Prerequisites

- Node.js 18 or later
- Docker and Docker Compose
- Ethereum RPC URL (Alchemy, Infura, etc.)

### Environment Setup

1. Create a `.env.local` file with your Ethereum RPC URL:

```
# Ethereum RPC URL (required)
PONDER_RPC_URL_1=https://eth-mainnet.g.alchemy.com/v2/your-api-key

# CryptoCompare API Key (for ETH price data)
CRYPTOCOMPARE_API_KEY=193c7d86141cc605958fee66739113c13a0dbee55f0d66075fa19e7721ceced5
```

### Running Locally

Start all services with Docker Compose:

```bash
docker-compose up
```

This will launch:
- PostgreSQL database
- pgAdmin (available at http://localhost:5050)
- Combined server (Ponder + API)
- Worker processes

### Database Setup

The PostgreSQL database is configured with the following credentials:

- Host: localhost (from your machine) or postgres (from Docker)
- Port: 5432
- Database: nounberg
- Username: nounberg
- Password: nounberg

pgAdmin is available at http://localhost:5050 for database management (login with admin@example.com / admin).

If you need to reset the database:

```bash
docker-compose down -v
docker-compose up
```

## API Documentation

### Paginated Auction Events

Retrieve auction events with pagination:

```
GET /api/events?limit=10&cursor={cursor}&type={type}
```

Parameters:
- `limit` (optional): Number of events per page (default: 10, max: 100)
- `cursor` (optional): Pagination cursor for the next page
- `type` (optional): Filter by event type ('created', 'bid', 'settled')

Response:
```json
{
  "events": [
    {
      "id": "0x123..._123",
      "type": "bid",
      "nounId": 123,
      "txHash": "0x123...",
      "blockNumber": 15000000,
      "blockTimestamp": 1656789012,
      "bidder": "0xabc...",
      "bidderEns": "vitalik.eth",
      "value": "1000000000000000000",
      "valueUsd": 1800.52,
      "headline": "Bid placed on Noun #123 for 1 Ξ ($1,800) by vitalik.eth",
      "thumbnailUrl": "https://noun.pics/123"
    },
    // ...more events
  ],
  "nextCursor": "1656789000_122",
  "count": 10
}
```

### Real-time Events via WebSocket

Connect to the WebSocket endpoint to receive real-time auction events.

1. Connect to `ws://localhost:3000/ws` (WebSocket URL)
2. Send a subscription message:
```json
{
  "type": "subscribe"
}
```
3. Receive events in real-time:
```json
{
  "type": "event",
  "data": {
    // Event data
  }
}
```

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1656789012345
}
```

## Project Structure

- `src/server`: API server with HTTP and WebSocket endpoints
- `src/workers`: Worker processes for data enrichment
- `src/lib`: Shared utilities and database repositories
- `src/types`: Shared type definitions
- `init-db.sql`: Database schema for auxiliary tables

## Design Decisions

- **Ponder for Database Schema Management**: Using Ponder's schema system for the core auction events table, with simple SQL scripts for auxiliary tables.
- **PostgreSQL for both Data and Job Queue**: Using a single database system for both data storage and job queue (via LISTEN/NOTIFY) simplifies the architecture.
- **Caching Strategy**:
  - ENS names: Cached for 48 hours
  - ETH prices: Historical prices cached for 30 days, recent prices for 15 minutes
- **Separation of Concerns**: 
  - Indexer only cares about getting events into the database
  - Workers focus on data enrichment
  - API delivers data to clients
- **Modern Architecture**: Using Hono.js with WebSockets for a modern, performant API design.
- **Repository Pattern**: Using a data access layer to abstract database operations.
- **CryptoCompare API**: Using CryptoCompare's historical price API for reliable ETH/USD price data.
- **BigInt Handling**: Proper serialization of BigInt values to support blockchain data.

## License

MIT