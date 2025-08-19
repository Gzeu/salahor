import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Send a test message
  ws.send('Hello from test client!');
  
  // Close the connection after 5 seconds
  setTimeout(() => {
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('close', () => {
  console.log('Disconnected from WebSocket server');});
