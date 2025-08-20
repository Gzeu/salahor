const WebSocket = require('ws');

const WS_PORT = 4000;
console.log(`Creating WebSocket connection to ws://localhost:${WS_PORT}`);

const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Send a test message
  const testMsg = {
    type: 'test',
    message: 'Hello, WebSocket!',
    timestamp: Date.now()
  };
  
  console.log('Sending test message:', JSON.stringify(testMsg, null, 2));
  ws.send(JSON.stringify(testMsg));
  
  // Schedule a disconnect after 2 seconds
  setTimeout(() => {
    console.log('Closing connection...');
    ws.close(1000, 'Test complete');
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    console.log('📨 Received message:', JSON.stringify(msg, null, 2));
  } catch (e) {
    console.log('📨 Received (raw):', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔴 Connection closed with code ${code}: ${reason || 'No reason provided'}`);
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  if (error.code) console.error('Error code:', error.code);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  ws.close(1001, 'Client shutdown');
});
