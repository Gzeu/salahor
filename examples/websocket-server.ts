import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = 3000;

// Create HTTP server
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running. Use a WebSocket client to connect.');
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Track connected clients
const clients = new Map();

// Handle new connections
wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);
  console.log(`New connection: ${clientId}`);
  
  // Send welcome message
  ws.send(JSON.stringify({ type: 'connection', id: clientId, status: 'connected' }));
  
  // Handle messages from client
  ws.on('message', (message: string) => {
    console.log(`Received from ${clientId}:`, message.toString());
    
    // Echo the message back to the client
    ws.send(`Echo: ${message}`);
    
    // Example of broadcasting to all clients
    // wss.clients.forEach((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(`Broadcast: ${message}`);
    //   }
    // });
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Connection closed: ${clientId}`);
    clients.delete(clientId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`Error with client ${clientId}:`, error);
  });
});

// Handle server errors
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
  console.log('HTTP server is running on http://localhost:3000');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close all client connections
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, 'Server shutting down');
    }
  });
  
  // Close the server
  wss.close(() => {
    httpServer.close(() => {
      console.log('Server has been shut down');
      process.exit(0);
    });
  });
});
