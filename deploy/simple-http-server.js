const http = require('http');
const WebSocket = require('ws');

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }
  res.writeHead(404);
  res.end();
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    ws.send(`Echo: ${message}`);
  });
  
  ws.send('Welcome to the WebSocket server!');
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the server
const PORT = 4001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('WebSocket server running at ws://localhost:4001');
});
