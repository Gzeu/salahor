import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

console.log('Starting WebSocket server...');

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const clientAddress = req.socket.remoteAddress;
  console.log(`New connection from ${clientAddress}`);
  
  // Send welcome message
  ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      console.log(`Received from ${clientAddress}:`, message.toString());
      // Echo the message back
      ws.send(JSON.stringify({
        type: 'echo',
        timestamp: new Date().toISOString(),
        message: message.toString()
      }));
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${clientAddress} disconnected`);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.close();
  server.close();
  process.exit(0);
});
