# Quick Start Guide

## Prerequisites
- Node.js 16.0.0 or higher
- npm or pnpm

## Installation

### Using pnpm (recommended)
```bash
pnpm add @salahor/websocket-server
```

### Using npm
```bash
npm install @salahor/websocket-server
```

## Basic Usage

1. Create a new file `server.js`:

```javascript
const { WebSocketServer } = require('@salahor/websocket-server');

// Create a new WebSocket server
const server = new WebSocketServer({
  port: 4002,
  path: '/ws'
});

// Handle new connections
server.on('connection', (client) => {
  console.log('New client connected');
  
  // Send welcome message
  client.send('Welcome to the WebSocket server!');
  
  // Handle incoming messages
  client.on('message', (message) => {
    console.log('Received:', message);
    
    // Echo the message back
    client.send(`Echo: ${message}`);
    
    // Broadcast to all clients
    server.broadcast(`Broadcast: ${message}`);
  });
  
  // Handle client disconnection
  client.on('close', () => {
    console.log('Client disconnected');  
  });
});

// Start the server
console.log('WebSocket server running on ws://localhost:4002/ws');
```

2. Start the server:
```bash
node server.js
```

3. Test the connection using a WebSocket client:
```javascript
// In browser console or Node.js client
const ws = new WebSocket('ws://localhost:4002/ws');

ws.onopen = () => {
  console.log('Connected to server');
  ws.send('Hello, server!');
};

ws.onmessage = (event) => {
  console.log('Message from server:', event.data);
};
```

## Configuration Options

### Server Options
```javascript
const server = new WebSocketServer({
  port: 4002,              // Port to listen on
  path: '/ws',             // WebSocket endpoint path
  maxPayload: 1048576,     // Max message size in bytes (1MB)
  clientTracking: true,    // Track connected clients
  perMessageDeflate: true  // Enable compression
});
```

### Environment Variables
Set these in your `.env` file or deployment environment:
```env
PORT=4002
NODE_ENV=production
LOG_LEVEL=info
```

## Next Steps
- Check out the [API Documentation](./api.md) for detailed usage
- Explore [examples](./examples) for common use cases
- Learn about [deployment options](./deployment.md)

## Need Help?
- Open an issue on GitHub
- Check the [troubleshooting guide](./troubleshooting.md)
- Join our [community forum](https://github.com/salahor/community)
