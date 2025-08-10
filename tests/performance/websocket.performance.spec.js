import { test, expect } from '@playwright/test';
import { createWebSocketServer, createWebSocketClient } from '../../src/connectors/websocket.js';

const MESSAGE_COUNT = 1000;
const TIMEOUT = 30000; // 30 seconds

test.describe('WebSocket Performance Tests', () => {
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
    
    // Wait for connection
    await new Promise(resolve => {
      const checkConnection = () => {
        if (client.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          setTimeout(checkConnection, 10);
        }
      };
      checkConnection();
    });
  });

  test.afterAll(async () => {
    // Cleanup
    if (client) {
      client.unsubscribe(messageHandler);
      await client.close();
    }
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('measure message throughput and latency', async ({}, testInfo) => {
    testInfo.setTimeout(TIMEOUT);
    receivedMessages = [];
    
    // Start measuring time
    const startTime = performance.now();
    
    // Send messages in batches to avoid overwhelming the connection
    const BATCH_SIZE = 100;
    const batches = Math.ceil(MESSAGE_COUNT / BATCH_SIZE);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchPromises = [];
      const batchStart = batch * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, MESSAGE_COUNT);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const message = { id: i, timestamp: Date.now() };
        batchPromises.push(
          client.send(JSON.stringify(message))
            .catch(err => console.error('Error sending message:', err))
        );
      }
      
      await Promise.all(batchPromises);
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
    
    // Calculate latency statistics
    let totalLatency = 0;
    let minLatency = Infinity;
    let maxLatency = 0;
    
    receivedMessages.forEach(msg => {
      const latency = Date.now() - msg.timestamp;
      totalLatency += latency;
      minLatency = Math.min(minLatency, latency);
      maxLatency = Math.max(maxLatency, latency);
    });
    
    const avgLatency = totalLatency / MESSAGE_COUNT;
    
    // Log performance metrics
    console.log('\n--- WebSocket Performance Results ---');
    console.log(`Total messages: ${MESSAGE_COUNT}`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Throughput: ${messagesPerSecond} messages/second`);
    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Min latency: ${minLatency}ms`);
    console.log(`Max latency: ${maxLatency}ms`);
    
    // Add metrics to the test report
    testInfo.annotations.push(
      { type: 'performance', description: `Throughput: ${messagesPerSecond} msg/s` },
      { type: 'performance', description: `Avg Latency: ${avgLatency.toFixed(2)}ms` }
    );
    
    // Assert that all messages were received
    expect(receivedMessages.length).toBe(MESSAGE_COUNT);
    
    // Basic performance assertions (adjust thresholds as needed)
    expect(avgLatency).toBeLessThan(100); // Average latency < 100ms
    expect(Number(messagesPerSecond)).toBeGreaterThan(1000); // At least 1000 messages/second
  });
});
