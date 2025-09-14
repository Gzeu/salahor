import { WebSocketServer } from 'ws';
import http from 'http';

// Use a different port to avoid conflicts
const PORT = 3001;

console.log('Starting server with enhanced logging...');

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log('HTTP request received');
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

// Create WebSocket server
console.log('Creating WebSocket server...');
const wss = new WebSocketServer({ server });

// WebSocket server event handlers
wss.on('listening', () => {
  console.log('WebSocket server is now listening');
});

wss.on('connection', (ws, req) => {
  const clientAddress = req.socket.remoteAddress;
  console.log(`New WebSocket connection from ${clientAddress}`);
  
  ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));
  
  ws.on('message', (message) => {
    console.log(`Message from ${clientAddress}:`, message.toString());
    ws.send(`Echo: ${message}`);
  });
  
  ws.on('close', () => {
    console.log(`Client ${clientAddress} disconnected`);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start the server
console.log('Starting HTTP server...');
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log(`Server started on port ${address.port}`);
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.close();
  server.close();
  process.exit(0);
});
