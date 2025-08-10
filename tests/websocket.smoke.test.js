import { test, expect } from '@playwright/test';
import { createWebSocketServer, createWebSocketClient } from '../src/connectors/websocket.js';

test.describe('WebSocket Smoke Tests', () => {
  let server;
  let port;
  let client;
  let receivedMessages = [];
  let messageHandler;

  test.beforeEach(async () => {
    // Start WebSocket server
    server = await createWebSocketServer();
    port = server.address().port;
    
    // Reset received messages
    receivedMessages = [];
    
    // Create WebSocket client
    client = createWebSocketClient(`ws://localhost:${port}`, {
      reconnectDelay: 100,
      maxReconnectAttempts: 3
    });
    
    // Setup message handler to collect messages
    messageHandler = (data) => {
      receivedMessages.push(JSON.parse(data));
    };
    
    // Subscribe to messages
    client.subscribe(messageHandler);
  });

  test.afterEach(async () => {
    // Cleanup
    if (client) {
      client.unsubscribe(messageHandler);
      await client.close();
    }
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('should send and receive a message', async () => {
    const testMessage = { id: 1, text: 'test' };
    
    // Send a message
    await client.send(JSON.stringify(testMessage));
    
    // Wait for the message to be received
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the message was received
    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0]).toEqual(testMessage);
  });

  test('should handle multiple messages', async () => {
    const messages = [
      { id: 1, text: 'first' },
      { id: 2, text: 'second' },
      { id: 3, text: 'third' }
    ];
    
    // Send multiple messages
    for (const message of messages) {
      await client.send(JSON.stringify(message));
    }
    
    // Wait for messages to be received
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify all messages were received
    expect(receivedMessages).toHaveLength(messages.length);
    expect(receivedMessages).toEqual(expect.arrayContaining(messages));
  });
});
