# WebSocket Connector

High-level WebSocket API with auto-reconnect and message queuing for browser and Node.js.

## Features

- Auto-reconnect with configurable delay/attempts
- Message queuing when offline
- TypeScript support
- Cross-platform (browser & Node.js)
- Hybrid HTTP/WebSocket server

## Quick Start

### Client

```javascript
import { createWebSocketClient } from 'salahor/connectors';

const client = createWebSocketClient('ws://localhost:8080', {
  reconnectDelay: 1000,
  maxReconnectAttempts: 5
});

// Send message
client.send('Hello!');

// Receive messages
for await (const msg of client.messages) {
  console.log('Received:', msg);
}
```

### Server (Node.js)

```javascript
import { createWebSocketServer } from 'salahor/connectors';

const server = createWebSocketServer({ port: 8080 });
server.broadcast('Hello, clients!');
```

## API

### `createWebSocketClient(url, options)`

**Options:**
- `reconnectDelay`: Delay between reconnects (ms, default: 1000)
- `maxReconnectAttempts`: Max reconnects (0=unlimited, default: 5)
- `binaryType`: 'blob' or 'arraybuffer'
- `signal`: AbortSignal to close connection

### `createWebSocketServer(options)`

**Options:**
- `port`: Port to listen on (default: 8080)
- `host`: Host to bind to (default: 'localhost')
- `signal`: AbortSignal to close server

### `createHybridServer(options)`

Same as WebSocket server but also handles HTTP requests via `onRequest` handler.

## Error Handling

```javascript
const client = createWebSocketClient('ws://localhost:8080');

client.messages.subscribe({
  next: msg => console.log('Message:', msg),
  error: err => console.error('Error:', err),
  complete: () => console.log('Disconnected')
});
```

## Browser Example

```html
<script type="module">
  import { createWebSocketClient } from 'https://unpkg.com/salahor/dist/connectors/index.js';
  
  const client = createWebSocketClient('ws://localhost:8080');
  client.send('Hello from browser!');
</script>
```

## Advanced Usage

### Custom Reconnection Logic

```javascript
const client = createWebSocketClient('ws://localhost:8080', {
  reconnectDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000)
});
```

### Binary Data

```javascript
// Send binary data
const data = new Uint8Array([1, 2, 3]);
client.send(data.buffer);

// Receive binary data
for await (const msg of client.messages) {
  if (msg instanceof ArrayBuffer) {
    const data = new Uint8Array(msg);
    console.log('Binary data:', data);
  }
}
```
