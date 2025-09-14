# WebSocket Server API Documentation

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
  - [Server Initialization](#server-initialization)
  - [Connection Management](#connection-management)
  - [Message Handling](#message-handling)
  - [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview
The WebSocket server provides real-time bidirectional communication between clients and server using the WebSocket protocol. It's built on top of the `ws` library and supports multiple concurrent connections with message broadcasting capabilities.

## Getting Started

### Installation
```bash
npm install @salahor/websocket-server
```

### Basic Usage
```javascript
const { WebSocketServer } = require('@salahor/websocket-server');

const server = new WebSocketServer({
  port: 4002,
  path: '/ws'
});

server.on('connection', (client) => {
  console.log('New client connected');
  
  client.on('message', (message) => {
    console.log('Received:', message);
    client.send(`Echo: ${message}`);
  });
});
```

## API Reference

### Server Initialization

```javascript
const server = new WebSocketServer(options);
```

**Options:**
- `port` (Number, default: 4002): The port to listen on
- `path` (String, default: '/'): The WebSocket endpoint path
- `maxPayload` (Number, default: 1048576): Maximum allowed message size in bytes
- `clientTracking` (Boolean, default: true): Track connected clients

### Connection Management

#### Event: 'connection'
Emitted when a new client connects.

```javascript
server.on('connection', (client, request) => {
  // Handle new connection
});
```

#### Event: 'close'
Emitted when the server closes.

### Message Handling

#### client.send(message)
Send a message to a specific client.

```javascript
client.send('Hello, client!');
```

#### server.broadcast(message)
Send a message to all connected clients.

```javascript
server.broadcast('Announcement: Server restarting soon');
```

### Error Handling

#### Event: 'error'
Emitted when an error occurs.

```javascript
server.on('error', (error) => {
  console.error('Server error:', error);
});
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 4002)
- `NODE_ENV`: Environment mode (development/production)
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Examples

### Basic Echo Server
```javascript
const { WebSocketServer } = require('@salahor/websocket-server');

const server = new WebSocketServer({ port: 4002 });

server.on('connection', (client) => {
  console.log('Client connected');
  
  client.on('message', (message) => {
    console.log('Received:', message);
    client.send(`Echo: ${message}`);
  });
});
```

### Broadcasting Messages
```javascript
server.on('connection', (client) => {
  // Send welcome message
  client.send('Welcome to the chat!');
  
  // Broadcast when a new user joins
  server.broadcast('A new user has joined the chat');
  
  // Handle incoming messages
  client.on('message', (message) => {
    // Broadcast message to all clients
    server.broadcast(`User: ${message}`);
  });
});
```

## Troubleshooting

### Common Issues
1. **Port in use**: Make sure no other service is using the same port
2. **Connection refused**: Verify the server is running and accessible
3. **Message not received**: Check client-side WebSocket connection and event listeners

### Logging
Enable debug logging by setting the `DEBUG` environment variable:
```bash
DEBUG=websocket:* node server.js
```

### Performance Tuning
- Adjust `maxPayload` based on expected message sizes
- Monitor memory usage with large numbers of concurrent connections
- Consider load balancing for high-availability deployments
