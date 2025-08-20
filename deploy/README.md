# Salahor WebSocket Server

A production-ready WebSocket server implementation with enterprise-grade features for building real-time applications.

[![npm version](https://img.shields.io/npm/v/@salahor/websocket-server.svg?style=flat-square)](https://www.npmjs.com/package/@salahor/websocket-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

## ✨ Features

- 🚀 **High Performance**: Built on Node.js with efficient WebSocket handling
- 🔒 **Secure**: Supports WSS (WebSocket Secure) and authentication
- 📡 **Scalable**: Designed for horizontal scaling
- 🔄 **Real-time**: Low-latency bidirectional communication
- 📊 **Monitoring**: Built-in health checks and metrics
- 🛡️ **Production-ready**: Includes logging, error handling, and graceful shutdown
- 🔌 **Extensible**: Easy to integrate with existing systems

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add @salahor/websocket-server

# Using npm
npm install @salahor/websocket-server

# Using yarn
yarn add @salahor/websocket-server
```

## 🚀 Quick Start

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

console.log('WebSocket server running on ws://localhost:4002/ws');
```

## 📚 Documentation

For detailed documentation, please visit our [documentation site](https://salahor.github.io/websocket-server) or check the `/docs` directory.

- [API Reference](./docs/api.md)
- [Quick Start Guide](./docs/quick-start.md)
- [Deployment Guide](./docs/deployment.md)
- [Examples](./examples/)

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4002` | Port to listen on |
| `NODE_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `info` | Logging level |
| `MAX_PAYLOAD` | `1048576` | Max message size in bytes |

### Example `.env` file

```env
PORT=4002
NODE_ENV=production
LOG_LEVEL=info
MAX_PAYLOAD=1048576
```

## 🚀 Deployment

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start ecosystem.config.js

# Save the process list
pm2 save

# Generate startup script
pm2 startup
```

### Using Docker

```bash
# Build the image
docker build -t salahor-websocket .

# Run the container
docker run -d -p 4002:4002 --name ws-server salahor-websocket
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

- GitHub: [@salahor](https://github.com/salahor)
- Email: contact@salahor.dev
- Twitter: [@salahor_dev](https://twitter.com/salahor_dev)

```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

## Development

Start the development server:
```bash
npm run dev
```

## WebSocket Server

The WebSocket server runs on port 4002 by default and provides the following features:

### Features
- **Echo Functionality**: Sends back any message it receives
- **Welcome Message**: Sends a welcome message on connection
- **Connection Logging**: Logs client connections and disconnections
- **Message Logging**: Logs all received messages

### Example Usage

1. Start the WebSocket server:
   ```bash
   node -e "const WebSocket = require('ws'); const wss = new WebSocket.Server({ port: 4002 }); console.log('WebSocket server running on ws://localhost:4002'); wss.on('connection', ws => { console.log('Client connected'); ws.send('Welcome!'); ws.on('message', msg => { console.log('Received:', msg.toString()); ws.send('Echo: ' + msg); }); });"
   ```

2. Connect with a WebSocket client:
   ```javascript
   const ws = new WebSocket('ws://localhost:4002');
   ws.on('open', () => {
     console.log('Connected to server');
     ws.send('Hello!');
   });
   ws.on('message', msg => console.log('From server:', msg.toString()));
   ```

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

Or use PM2 for process management:
```bash
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Set up PM2 to start on system boot
pm2 startup
pm2 save
```

## Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with hot-reload
- `npm test` - Run tests
- `npm run lint` - Run linter
- `npm run format` - Format code

## API Endpoints

- `GET /health` - Health check endpoint
- `WS /` - WebSocket endpoint

## Monitoring

To monitor the application:

```bash
# Show logs
pm2 logs websocket-server

# Show application status
pm2 status

# Monitor resources
pm2 monit
```

## License

MIT
