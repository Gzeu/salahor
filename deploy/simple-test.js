const WebSocket = require('ws');

console.log('Connecting to WebSocket server...');
const ws = new WebSocket('ws://localhost:4001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  ws.send('Hello from test client');
});

ws.on('message', (data) => {
  console.log('📨 Message from server:', data.toString());
  ws.close();
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Disconnected from WebSocket server');
});
