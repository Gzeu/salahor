/**
 * WebSocket Connector Demo
 * 
 * This example demonstrates how to use the WebSocket connector for both
 * client and server communication.
 */

import { createWebSocketClient, createWebSocketServer } from '../src/connectors/websocket.js';

// Check if running in Node.js environment
const isNode = typeof window === 'undefined';

async function runDemo() {
  if (isNode) {
    // Server-side code
    console.log('Starting WebSocket server...');
    
    const server = createWebSocketServer({
      port: 8080,
      host: 'localhost',
    });

    console.log(`WebSocket server running on ws://localhost:8080`);
    console.log('Press Ctrl+C to stop the server');

    // Handle server close
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server.close(() => {
        console.log('Server stopped');
        process.exit(0);
      });
    });
  } else {
    // Client-side code
    console.log('Connecting to WebSocket server...');
    
    const client = createWebSocketClient('ws://localhost:8080', {
      reconnectDelay: 2000,
      maxReconnectAttempts: 5
    });

    // Handle incoming messages
    for await (const message of client.messages) {
      console.log('Received:', message);
    }

    // Send a test message every 2 seconds
    let counter = 0;
    setInterval(() => {
      const msg = `Hello from client! (${++counter})`;
      console.log('Sending:', msg);
      client.send(msg);
    }, 2000);

    // Handle connection status changes
    const statusElement = document.createElement('div');
    statusElement.style.position = 'fixed';
    statusElement.style.top = '10px';
    statusElement.style.right = '10px';
    statusElement.style.padding = '10px';
    statusElement.style.background = '#333';
    statusElement.style.color = '#fff';
    statusElement.style.borderRadius = '4px';
    statusElement.textContent = `Status: ${client.readyState}`;
    document.body.appendChild(statusElement);

    // Update status when connection state changes
    const updateStatus = () => {
      statusElement.textContent = `Status: ${client.readyState}`;
      statusElement.style.background = client.readyState === 'connected' ? '#2e7d32' : '#c62828';
    };

    // Initial status update
    updateStatus();

    // Subscribe to status changes
    const unsubscribe = client.messages.subscribe(() => {
      updateStatus();
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      unsubscribe();
      client.close();
    });
  }
}

// Run the demo
runDemo().catch(console.error);
