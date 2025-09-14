const WebSocket = require('ws');
const fs = require('fs');

const logStream = fs.createWriteStream('test-connection.log', { flags: 'a' });

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    logStream.write(logMessage);
}

log('Starting WebSocket connection test...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
    log('Connected to WebSocket server');
    ws.send('Hello from test client');
});

ws.on('message', (data) => {
    log(`Received: ${data}`);
});

ws.on('error', (error) => {
    log(`WebSocket error: ${error.message}`);
});

ws.on('close', () => {
    log('Disconnected from WebSocket server');
});

// Close connection after 5 seconds
setTimeout(() => {
    ws.close();
    process.exit(0);
}, 5000);
