import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3000;
const server = http.createServer();
const wss = new WebSocketServer({ server });

console.log('Starting WebSocket server...');

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.send('Connected to Simple WebSocket Server');
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
