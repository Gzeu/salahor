import { createWebSocketServer } from '../packages/protocol-connectors/websocket/dist/server/index.js';
import http from 'http';
import pino from 'pino';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PATH = process.env.WS_PATH || '/';

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    service: 'salahor-websocket-server',
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  }));
});

// Create WebSocket server with options
const wss = createWebSocketServer({
  server,
  path: PATH,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    threshold: 1024,
    concurrencyLimit: 10,
  },
});

// Track connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientId = req.headers['sec-websocket-key'] || Date.now().toString(36);
  const clientIp = req.socket.remoteAddress;
  
  clients.add(ws);
  logger.info({ clientId, clientIp, event: 'connect' }, 'New WebSocket connection');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connect',
    id: clientId,
    timestamp: new Date().toISOString(),
    message: 'Connected to Salahor WebSocket Server',
  }));
  
  // Broadcast new connection to all clients
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'system',
        event: 'user_joined',
        clientId,
        timestamp: new Date().toISOString(),
      }));
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info({ clientId, data }, 'Received message');
      
      // Echo the message back to the client
      ws.send(JSON.stringify({
        ...data,
        serverTime: new Date().toISOString(),
        received: true
      }));
      
      // Broadcast to all other clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'broadcast',
            from: clientId,
            ...data,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    } catch (error) {
      logger.error({ clientId, error, message }, 'Error processing message');
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format',
        timestamp: new Date().toISOString(),
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    logger.info({ clientId, event: 'disconnect' }, 'Client disconnected');
    
    // Notify other clients
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'system',
          event: 'user_left',
          clientId,
          timestamp: new Date().toISOString(),
        }));
      }
    });
  });

  ws.on('error', (error) => {
    logger.error({ clientId, error }, 'WebSocket error');
  });
});

// Handle server errors
server.on('error', (error) => {
  logger.fatal({ error }, 'Server error');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  
  // Close all WebSocket connections
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.close(1001, 'Server is shutting down');
    }
  });
  
  // Close the server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

// Start the server
server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}`);
  logger.info(`WebSocket server running on ws://${HOST}:${PORT}${PATH}`);
  logger.info(`Health check at http://${HOST}:${PORT}/health`);
});
