# @salahor/sse

Server-Sent Events (SSE) connector for the Salahor ecosystem. Provides a unified interface for working with SSE clients and servers using the EventStream pattern from `@salahor/core`.

## Features

- 🌐 **Universal API**: Works in both Node.js and browser environments
- 🔄 **Bi-directional Communication**: Full support for SSE protocol with automatic reconnection
- 🛡️ **Type Safety**: Built with TypeScript for enhanced developer experience
- ⚡ **Efficient**: Lightweight and performant implementation
- 🔌 **EventStream Integration**: Seamlessly integrates with `@salahor/core` EventStream API

## Installation

```bash
# Using pnpm (recommended)
pnpm add @salahor/sse @salahor/core

# Using npm
npm install @salahor/sse @salahor/core

# Using yarn
yarn add @salahor/sse @salahor/core
```

## Quick Start

### Server-Side Usage (Node.js)

```typescript
import { createSseServer } from '@salahor/sse';
import express from 'express';

const app = express();
const sseServer = createSseServer({
  // Optional configuration
  path: '/events',
  headers: {
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
  },
});

// Handle new connections
sseServer.connections.subscribe(connection => {
  console.log('New client connected:', connection.id);
  
  // Send welcome message
  connection.send({ type: 'welcome', data: 'Connected to SSE server' });
  
  // Handle disconnection
  connection.on('close', () => {
    console.log('Client disconnected:', connection.id);
  });
});

// Broadcast to all clients
function broadcast(message: string) {
  sseServer.broadcast({ type: 'message', data: message });
}

// Mount SSE endpoint
app.get('/events', sseServer.handler);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');});
```

### Client-Side Usage (Browser)

```typescript
import { createSseClient } from '@salahor/sse';

const client = createSseClient('http://localhost:3000/events');

// Subscribe to all events
client.events.subscribe(event => {
  console.log('Received event:', event);
});

// Handle connection status
client.status.subscribe(status => {
  console.log('Connection status:', status);
});

// Close connection when done
// client.close();
```

## API Reference

### `createSseServer(options: SseServerOptions): SseServer`

Creates a new SSE server instance.

**Options:**
- `path`: Base path for SSE endpoint (default: `'/'`)
- `headers`: Custom headers to include in responses
- `pingInterval`: Interval for sending keep-alive pings (ms)
- `maxConnections`: Maximum number of concurrent connections

### `createSseClient(url: string, options?: SseClientOptions): SseClient`

Creates a new SSE client instance.

**Options:**
- `headers`: Custom headers for the connection
- `withCredentials`: Whether to include credentials (cookies, HTTP auth)
- `reconnectDelay`: Delay before attempting to reconnect (ms)
- `maxReconnectAttempts`: Maximum number of reconnection attempts

## Examples

### Sending Custom Events

```typescript
// Server-side
connection.send({
  type: 'user-joined',
  data: JSON.stringify({ userId: '123', username: 'johndoe' }),
  id: 'event-123',
  retry: 3000 // Reconnection time in ms
});

// Client-side
client.events.subscribe(event => {
  if (event.type === 'user-joined') {
    const user = JSON.parse(event.data);
    console.log(`${user.username} joined!`);
  }
});
```

### Error Handling

```typescript
// Server-side
connection.on('error', (error) => {
  console.error('Connection error:', error);
});

// Client-side
client.events.subscribe({
  next: (event) => console.log('Event:', event),
  error: (error) => console.error('Error:', error),
  complete: () => console.log('Connection closed')
});
```

## License

MIT
