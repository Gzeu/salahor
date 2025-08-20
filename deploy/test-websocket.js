import WebSocket from 'ws';

console.log('Attempting to connect to WebSocket server at ws://localhost:4001');

const ws = new WebSocket('ws://localhost:4001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Sending test message...');
  ws.send(JSON.stringify({ type: 'test', data: 'Hello from test client' }));
});

ws.on('message', (data) => {
  console.log('📨 Message from server:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.error('Error details:', error);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Disconnected from WebSocket server. Code: ${code}, Reason: ${reason}`);
  process.exit(0);
});

// Close connection after 5 seconds
setTimeout(() => {
  console.log('⏱️  Test complete, closing connection...');
  ws.close();
}, 5000);
