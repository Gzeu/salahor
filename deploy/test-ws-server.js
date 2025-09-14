import { WebSocketServer } from 'ws';
import http from 'http';

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  // Send a welcome message
  ws.send('Connected to WebSocket server');
  
  // Handle messages from clients
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    // Echo the message back to the client
    ws.send(`Echo: ${message}`);
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = 4003;
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please choose a different port.`);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  wss.close();
  server.close(() => {
    console.log('Server has been shut down');
    process.exit(0);
  });
});
