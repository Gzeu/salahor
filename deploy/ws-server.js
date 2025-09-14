const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = 4000;
const HOST = 'localhost';

// Create HTTP server
const server = http.createServer((req, res) => {
    console.log(`HTTP ${req.method} ${req.url}`);
    
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'websocket-server',
            timestamp: new Date().toISOString(),
            clients: wss.clients.size
        }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    const clientId = Date.now();
    console.log(`Client ${clientId} connected`);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        clientId,
        timestamp: new Date().toISOString()
    }));
    
    // Broadcast to all clients when someone connects
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'notification',
                message: `New client connected (${clientId})`,
                timestamp: new Date().toISOString()
            }));
        }
    });
    
    // Handle incoming messages
    ws.on('message', (message) => {
        console.log(`Received from ${clientId}:`, message.toString());
        
        // Echo the message back to the client
        ws.send(JSON.stringify({
            type: 'echo',
            clientId,
            message: message.toString(),
            timestamp: new Date().toISOString()
        }));
    });
    
    // Handle client disconnection
    ws.on('close', () => {
        console.log(`Client ${clientId} disconnected`);
        
        // Notify other clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'notification',
                    message: `Client ${clientId} disconnected`,
                    timestamp: new Date().toISOString()
                }));
            }
        });
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
});

// Start the server
server.listen(PORT, HOST, () => {
    console.log(`✅ WebSocket server running on ws://${HOST}:${PORT}`);
    console.log(`✅ HTTP server running on http://${HOST}:${PORT}`);
    console.log('\nTo test the server, open your browser to:');
    console.log(`  http://${HOST}:${PORT}/simple-test.html`);
});

// Handle server errors
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    
    // Close all WebSocket connections
    for (const [clientId, ws] of clients.entries()) {
        ws.close(1001, 'Server shutdown');
    }
    
    // Close the server
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close(1001, 'Server shutdown');
        }
    });
    server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
    });
});
