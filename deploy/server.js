import { createWebSocketServer } from '@salahor/websocket';
import http from 'http';

const PORT = process.env.PORT || 3000;
const server = http.createServer();
const wss = createWebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Send welcome message
  ws.send('Connected to Salahor WebSocket Server');
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
