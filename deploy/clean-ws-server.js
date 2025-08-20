import WebSocket from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const PORT = process.env.PORT || 4001;
const HOST = process.env.HOST || 'localhost';

// Create HTTP server
const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'websocket-server',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Track connected clients
const clients = new Map();

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    const clientId = uuidv4();
    console.log(`New WebSocket connection: ${clientId}`);
    
    wss.handleUpgrade(request, socket, head, (ws) => {
        // Store the client connection
        clients.set(clientId, ws);
        
        // Handle WebSocket messages
        ws.on('message', (message) => {
            console.log(`Received from ${clientId}:`, message.toString());
            
            // Echo the message back to the client
            ws.send(`Echo: ${message}`);
        });
        
        // Handle client disconnection
        ws.on('close', () => {
            console.log(`Client disconnected: ${clientId}`);
            clients.delete(clientId);
        });
        
        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connection_established',
            clientId,
            timestamp: new Date().toISOString()
        }));
    });
});

// Start the server
server.listen(PORT, HOST, () => {
    console.log(`✅ WebSocket server running on ws://${HOST}:${PORT}`);
    console.log(`✅ HTTP server running on http://${HOST}:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    
    // Close all WebSocket connections
    for (const [clientId, ws] of clients.entries()) {
        ws.close(1001, 'Server shutdown');
        clients.delete(clientId);
    }
    
    // Close the server
    server.close(() => {
        console.log('✅ Server has been shut down');
        process.exit(0);
    });
});
