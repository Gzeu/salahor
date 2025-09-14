const { WebSocketServer } = require('ws');
const http = require('http');
const pino = require('pino');
const dotenv = require('dotenv');

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
    service: 'simple-ws-server',
    version: '1.0.0',
    uptime: process.uptime(),
  }));
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: PATH });

// Track connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientId = Date.now();
  const clientIp = req.socket.remoteAddress;
  
  logger.info(`Client connected: ${clientId} from ${clientIp}`);
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId,
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString(),
  }));
  
  // Broadcast to other clients
  broadcast({
    type: 'client_connected',
    clientId,
    timestamp: new Date().toISOString(),
    totalClients: clients.size,
  }, ws);
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info(`Received message from ${clientId}:`, data);
      
      // Echo the message back to the client
      ws.send(JSON.stringify({
        ...data,
        serverReceivedAt: new Date().toISOString(),
      }));
    } catch (error) {
      logger.error(`Error processing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        error: error.message,
      }));
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(ws);
    logger.info(`Client disconnected: ${clientId}`);
    
    // Broadcast to other clients
    broadcast({
      type: 'client_disconnected',
      clientId,
      timestamp: new Date().toISOString(),
      totalClients: clients.size,
    });
  });
  
  // Handle errors
  ws.on('error', (error) => {
    logger.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Helper function to broadcast to all connected clients
function broadcast(message, excludeWs = null) {
  const messageString = typeof message === 'string' ? message : JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
      client.send(messageString);
    }
  });
}

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
});

// Start the server
server.listen(PORT, HOST, () => {
  logger.info(`Server is running on ws://${HOST}:${PORT}${PATH}`);
  logger.info(`HTTP server is running on http://${HOST}:${PORT}`);
});

// Handle graceful shutdown
const shutdown = () => {
  logger.info('Shutting down server...');
  
  // Close all WebSocket connections
  broadcast({ type: 'server_shutdown', message: 'Server is shutting down' });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1 = OPEN
      client.close(1001, 'Server shutdown');
    }
  });
  
  // Close the server
  server.close(() => {
    logger.info('Server has been shut down');
    process.exit(0);
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    logger.warn('Forcing server shutdown');
    process.exit(1);
  }, 5000);
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
