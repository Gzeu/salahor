import { test, expect } from '@playwright/test';
import { createWebSocketServer, createWebSocketClient } from '../../src/connectors/websocket.js';

// Test configuration
const MESSAGE_COUNT = 1000;
const TIMEOUT = 30000; // 30 seconds

test.describe('Basic WebSocket Performance Tests', () => {
  let server;
  let port;
  let client;
  let receivedMessages = [];
  let messageHandler;

  test.beforeAll(async () => {
    // Start WebSocket server
    server = await createWebSocketServer();
    port = server.address().port;
    
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

  test.afterAll(async () => {
    // Cleanup
    if (client) {
      client.unsubscribe(messageHandler);
      await client.close();
    }
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('basic message throughput', async ({}, testInfo) => {
    testInfo.setTimeout(TIMEOUT);
    receivedMessages = [];
    
    const startTime = performance.now();
    
    // Send messages
    for (let i = 0; i < MESSAGE_COUNT; i++) {
      const message = { id: i, timestamp: Date.now() };
      await client.send(JSON.stringify(message));
    }
    
    // Wait for all messages to be received
    await new Promise((resolve) => {
      const checkMessages = () => {
        if (receivedMessages.length >= MESSAGE_COUNT) {
          resolve();
        } else {
          setTimeout(checkMessages, 100);
        }
      };
      checkMessages();
    });
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const messagesPerSecond = (MESSAGE_COUNT / (totalTime / 1000)).toFixed(2);
    
    // Log performance metrics
    console.log('\n--- Basic WebSocket Performance Results ---');
    console.log(`Total messages: ${MESSAGE_COUNT}`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Throughput: ${messagesPerSecond} messages/second`);
    
    // Basic assertion to ensure messages were received
    expect(receivedMessages.length).toBe(MESSAGE_COUNT);
  });
});
