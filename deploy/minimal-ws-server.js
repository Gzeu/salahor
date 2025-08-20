const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 4000; // Changed to 4000 to avoid potential conflicts
const HOST = process.env.HOST || 'localhost'; // Changed from '0.0.0.0' to 'localhost' for better local development
const PATH = process.env.WS_PATH || '/';

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`HTTP ${req.method} ${req.url}`);
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'minimal-ws-server',
      timestamp: new Date().toISOString(),
      clients: wss.clients.size,
      path: PATH
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: PATH });

// Track connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientId = Date.now();
  const clientIp = req.socket.remoteAddress;
  
  console.log(`Client connected: ${clientId} from ${clientIp}`);
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId,
    message: 'Connected to WebSocket server',
    timestamp: new Date().toISOString(),
  }));
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received from ${clientId}:`, data);
      
      // Echo the message back to the client
      ws.send(JSON.stringify({
        ...data,
        serverReceivedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
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
    console.log(`Client disconnected: ${clientId}`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Start the server
console.log(`Starting server on ${HOST}:${PORT}...`);

server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❗ Port ${PORT} is already in use.`);
    console.log('Try these steps:');
    console.log('1. Close any other running instances');
    console.log(`2. Use a different port (set PORT environment variable)`);
    console.log('3. Wait a few seconds and try again');
  }
  process.exit(1);
});

minimalServer.listen(MINIMAL_PORT, () => {
  console.log(`✅ Minimal WebSocket server started on port ${MINIMAL_PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Server is running on ws://${HOST}:${PORT}${PATH}`);
  console.log(`✅ HTTP server is running on http://${HOST}:${PORT}`);
  console.log('\nTo test the server, open a new terminal and run:');
  console.log(`  curl http://${HOST}:${PORT}`);
  console.log('Or use the test client:');
  console.log('  node test-ws.js');
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('Shutting down server...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1001, 'Server shutdown');
    }
  });
  
  // Close the server
  server.close(() => {
    console.log('Server has been shut down');
    process.exit(0);
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.warn('Forcing server shutdown');
    process.exit(1);
  }, 5000);
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
