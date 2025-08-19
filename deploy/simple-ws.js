const WebSocket = require('ws');
const http = require('http');

const PORT = 3001;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Log to file and console
const fs = require('fs');
const logStream = fs.createWriteStream('server.log', { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    logStream.write(logMessage);
}

log('Starting WebSocket server...');

wss.on('connection', (ws) => {
    log('New WebSocket connection');
    
    ws.on('message', (message) => {
        log(`Received: ${message}`);
        ws.send(`Echo: ${message}`);
    });
    
    ws.on('close', () => {
        log('Client disconnected');
    });
    
    ws.send('Connected to WebSocket server');
});

server.on('error', (error) => {
    log(`Server error: ${error.message}`);
});

server.listen(PORT, () => {
    log(`Server is running on port ${PORT}`);
});
