import { test, expect } from '@playwright/test';
import { createWebSocketServer, createWebSocketClient } from '../src/connectors/websocket.js';

test.describe('Minimal WebSocket Test', () => {
  let server;
  let port;
  let client;

  test.beforeAll(async () => {
    // Start WebSocket server
    server = await createWebSocketServer();
    port = server.address().port;
    console.log(`WebSocket server started on port ${port}`);
  });

  test.afterAll(async () => {
    // Cleanup
    if (client) await client.close();
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('should create a WebSocket client', async () => {
    // Create WebSocket client
    client = createWebSocketClient(`ws://localhost:${port}`);
    
    // Basic test to see if client was created
    expect(client).toBeDefined();
    
    // Log client methods for debugging
    console.log('Client methods:', Object.keys(client));
    
    // Check if send method exists
    expect(typeof client.send).toBe('function');
    
    // Check if subscribe method exists
    expect(typeof client.subscribe).toBe('function');
  });
});
