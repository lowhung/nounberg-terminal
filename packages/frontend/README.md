# Nounberg Terminal Frontend

A real-time dashboard for monitoring Nouns DAO auction events. This application connects to the Nounberg Terminal WebSocket API to provide live updates on auction events.

## Features

- Real-time updates via WebSocket connection
- Clean, responsive user interface
- Visual indication of connection status
- Different styling for auction created, bid, and settled events
- Automatic reconnection if connection is lost

## Installation

1. **Navigate to the frontend directory**

```bash
cd nounberg-terminal/frontend
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm start
```

This will start the frontend development server, typically on port 3001 since the backend is running on port 3000.

## Building for Production

```bash
npm run build
```

This will create a production-ready build in the `build` directory.

## Integration with Backend

The frontend automatically connects to the WebSocket endpoint at `/ws` on the same host as the application is served from.

### API Endpoints Used

- `GET /api/events` - For fetching the list of recent events
- `GET /api/events?id={eventId}` - For fetching a specific event when notified via WebSocket

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   └── events.js      # API interaction functions
│   ├── components/
│   │   ├── EventCard.jsx  # Individual event display
│   │   ├── EventFeed.jsx  # List of events
│   │   ├── Header.jsx     # Application header
│   │   └── ConnectionStatus.jsx # WebSocket status indicator
│   ├── hooks/
│   │   └── useWebSocket.js # WebSocket connection hook
│   ├── App.js             # Main application component
│   └── index.js           # Application entry point
└── package.json           # Dependencies and scripts
```
