# @salahor/websocket

WebSocket connector for the Salahor ecosystem. Provides a unified interface for working with WebSockets using the EventStream pattern from `@salahor/core`.

## Features

- 🚀 **Real-time Communication**: Full-duplex communication channel over a single TCP connection
- ♻️ **Automatic Reconnection**: Built-in reconnection logic with configurable backoff
- 🔄 **Bi-directional Messaging**: Easy message passing between client and server
- 🛡️ **Type Safety**: TypeScript support for message types and events
- 🌐 **Cross-Platform**: Works in both browser and Node.js environments
- ⚡ **EventStream Integration**: Built on top of `@salahor/core` EventStream API

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Client API](#client-api)
  - [Server API](#server-api)
- [Advanced Usage](#advanced-usage)
  - [Custom Serialization](#custom-serialization)
  - [Error Handling](#error-handling)
  - [Connection Management](#connection-management)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Installation

```bash
# Using pnpm (recommended)
pnpm add @salahor/websocket ws

# Using npm
npm install @salahor/websocket ws

# Using yarn
yarn add @salahor/websocket ws
```

> **Note**: The `ws` package is a peer dependency and must be installed separately. For browser usage, you don't need to install `ws` as it uses the native WebSocket API.

## Quick Start

### Client-Side Usage

```typescript
import { createWebSocketClient } from '@salahor/websocket';

// Create a WebSocket client with automatic reconnection
const client = createWebSocketClient({
  url: 'ws://localhost:8080',
  reconnect: {
    retries: 5,
    delay: 1000,
    backoff: 2
  }
});

// Subscribe to connection status changes
client.connectionStatus.subscribe(status => {
  console.log('Connection status:', status);
  // Possible statuses: 'connecting', 'connected', 'disconnected', 'error'
});

// Subscribe to incoming messages
const unsubscribe = client.messages.subscribe({
  next: (message) => {
    console.log('Received message:', message);
  },
  error: (error) => {
    console.error('Error in message stream:', error);
  },
  complete: () => {
    console.log('Message stream completed');
  }
});

// Send a message
client.send(JSON.stringify({ 
  type: 'chat.message', 
  payload: { text: 'Hello, Server!', timestamp: Date.now() } 
}));

// Close the connection when done
// client.close();

// Unsubscribe from messages
// unsubscribe();
```

### Server-Side Usage

```typescript
import { createWebSocketServer } from '@salahor/websocket/server';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Create WebSocket server wrapper
const wsServer = createWebSocketServer(wss);

// Handle new connections
wsServer.connections.subscribe(({ client, messages, close }) => {
  console.log('New client connected');
  
  // Handle incoming messages
  const subscription = messages.subscribe({
    next: (message) => {
      console.log('Received message from client:', message);
      
      // Echo the message back to the client
      client.send(`Echo: ${message}`);
      
      // Or broadcast to all connected clients
      // wsServer.broadcast(`Broadcast: ${message}`);
    },
    error: (error) => {
      console.error('Error in client message stream:', error);
    },
    complete: () => {
      console.log('Client disconnected');
    }
  });
  
  // Clean up on disconnect
  return () => {
    subscription.unsubscribe();
  };
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});
```

## API Reference

### Client API

#### `createWebSocketClient(options: WebSocketClientOptions): WebSocketClient`

Creates a new WebSocket client.

**Options:**
- `url: string` - WebSocket server URL
- `protocols?: string | string[]` - Sub-protocols to use
- `reconnect?: ReconnectOptions` - Reconnection settings
  - `retries?: number` - Maximum number of reconnection attempts (default: `Infinity`)
  - `delay?: number` - Initial delay between reconnection attempts in ms (default: `1000`)
  - `backoff?: number` - Exponential backoff multiplier (default: `1.5`)
  - `maxDelay?: number` - Maximum delay between reconnection attempts (default: `30000`)
  - `onReconnect?: (attempt: number) => void` - Called before each reconnection attempt

**Returns:** `WebSocketClient` instance with the following properties:
- `messages: EventStream<MessageEvent>` - Stream of incoming messages
- `connectionStatus: EventStream<ConnectionStatus>` - Stream of connection status changes
- `send: (data: string | ArrayBuffer) => void` - Send data to the server
- `close: (code?: number, reason?: string) => void` - Close the connection
- `reconnect: () => void` - Manually trigger reconnection

### Server API

#### `createWebSocketServer(server: WebSocketServer): WebSocketServerWrapper`

Creates a WebSocket server wrapper around a `ws` WebSocket server.

**Parameters:**
- `server: WebSocketServer` - Instance of `ws` WebSocket server

**Returns:** `WebSocketServerWrapper` with the following properties:
- `connections: EventStream<ClientConnection>` - Stream of new client connections
- `broadcast: (data: string | ArrayBuffer) => void` - Send data to all connected clients
- `getConnectionCount: () => number` - Get current number of connected clients

## Advanced Usage

### Custom Serialization

By default, messages are passed as-is. You can implement custom serialization:

```typescript
// Client-side
const client = createWebSocketClient({
  url: 'ws://localhost:8080',
  serializer: (data) => JSON.stringify(data),
  deserializer: (message) => JSON.parse(message.data)
});

// Now you can send/receive objects directly
client.send({ type: 'chat.message', text: 'Hello!' });
client.messages.subscribe(message => {
  // message is already parsed to an object
  console.log('Received:', message);
});
```

### Error Handling

Handle errors at different levels:

```typescript
// Connection errors
client.connectionStatus.subscribe({
  next: (status) => {
    if (status === 'error') {
      console.error('Connection error');
    }
  }
});

// Message processing errors
client.messages.subscribe({
  error: (error) => {
    console.error('Error processing message:', error);
  }
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

## Performance Considerations

### Message Size
- Keep WebSocket messages as small as possible
- Consider compressing large messages before sending
- Batch multiple updates when possible

### Connection Management
- Implement proper connection cleanup on both client and server
- Use connection pooling when dealing with multiple clients
- Set appropriate timeouts and heartbeat intervals

### Scalability
- For high-traffic applications, consider using a WebSocket server cluster
- Use a message broker (like Redis) for horizontal scaling
- Monitor connection counts and message throughput

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

// Handle new connections
server.connections.subscribe((connection) => {
  console.log('New client connected');
  
  // Handle messages from this client
  const unsubscribe = connection.messages.subscribe((message) => {
    console.log('Received message:', message);
    
    // Echo the message back
    connection.send(`Echo: ${message}`);
  });
  
  // Handle disconnection
  connection.onClose.then(() => {
    console.log('Client disconnected');
    unsubscribe();
  });
});

console.log('WebSocket server running on ws://localhost:8080');
```

## API

### `createWebSocketClient(url: string, options?: WebSocketClientOptions): WebSocketClient`

Creates a new WebSocket client.

#### Parameters

- `url`: The WebSocket server URL to connect to.
- `options`: Optional configuration options.
  - `reconnectDelay`: Delay between reconnection attempts in milliseconds (default: 1000).
  - `maxReconnectAttempts`: Maximum number of reconnection attempts (default: Infinity).
  - `WebSocket`: Custom WebSocket implementation (useful for testing or custom environments).

### `createWebSocketServer(options: WebSocketServerOptions): WebSocketServer`

Creates a new WebSocket server.

#### Parameters

- `options`: Server configuration options.
  - `port`: The port to listen on.
  - `host`: The host to bind to (default: '0.0.0.0').
  - `server`: An existing HTTP/S server to use.
  - `WebSocketServer`: Custom WebSocket server implementation.

## License

MIT
