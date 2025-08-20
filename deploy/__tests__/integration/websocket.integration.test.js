const WebSocket = require('ws');
const { createServer } = require('http');
const { promisify } = require('util');
const { startServer } = require('../../src/server');
const { startMetricsServer } = require('../../src/monitoring');

const sleep = promisify(setTimeout);

// Test configuration
const TEST_PORT = 4004;
const METRICS_PORT = 9092;
const WS_URL = `ws://localhost:${TEST_PORT}`;
const METRICS_URL = `http://localhost:${METRICS_PORT}`;

// Helper function to create a WebSocket client
const createClient = (url = WS_URL, protocols = []) => {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url, protocols);
    client.on('open', () => resolve(client));
    client.on('error', reject);
  });
};

// Helper function to send a message and wait for response
const sendAndWait = (ws, message, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timeout waiting for message'));
    }, timeout);

    const onMessage = (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    };

    ws.on('message', onMessage);
    ws.send(message);
  });
};

describe('WebSocket Server Integration Tests', () => {
  let server;
  let metricsServer;
  let clients = [];

  beforeAll(async () => {
    // Start the WebSocket server
    server = await startServer(TEST_PORT);
    
    // Start the metrics server
    metricsServer = await startMetricsServer(METRICS_PORT);
    
    // Wait for servers to be ready
    await sleep(500);
  });

  afterAll(async () => {
    // Close all client connections
    await Promise.all(
      clients.map(
        (client) =>
          new Promise((resolve) => {
            if (client.readyState === WebSocket.OPEN) {
              client.on('close', resolve);
              client.close();
            } else {
              resolve();
            }
          })
      )
    );

    // Close servers
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (metricsServer) {
      await new Promise((resolve) => metricsServer.close(resolve));
    }
  });

  afterEach(async () => {
    // Clean up clients after each test
    clients = [];
  });

  test('should establish WebSocket connection', async () => {
    const client = await createClient();
    clients.push(client);
    expect(client.readyState).toBe(WebSocket.OPEN);
  });

  test('should echo messages', async () => {
    const client = await createClient();
    clients.push(client);
    
    const testMessage = 'Hello, WebSocket!';
    const response = await sendAndWait(client, testMessage);
    
    expect(response).toBe(`Echo: ${testMessage}`);
  });

  test('should handle binary messages', async () => {
    const client = await createClient();
    clients.push(client);
    
    const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    const response = await new Promise((resolve) => {
      client.on('message', (data) => {
        if (Buffer.isBuffer(data)) {
          resolve(data);
        }
      });
      client.send(binaryData);
    });
    
    expect(Buffer.compare(response, binaryData)).toBe(0);
  });

  test('should handle multiple concurrent clients', async () => {
    const numClients = 5;
    const testMessage = 'Concurrent test';
    const clients = await Promise.all(Array(numClients).fill().map(() => createClient()));
    
    const responses = await Promise.all(
      clients.map((client, index) => 
        sendAndWait(client, `${testMessage} ${index}`)
      )
    );
    
    responses.forEach((response, index) => {
      expect(response).toBe(`Echo: ${testMessage} ${index}`);
    });
    
    // Clean up
    await Promise.all(clients.map(client => 
      new Promise(resolve => client.close(resolve))
    ));
  });

  test('should handle connection close gracefully', async () => {
    const client = await createClient();
    
    // Wait for connection to be established
    await new Promise(resolve => client.on('open', resolve));
    
    // Close the connection
    const closePromise = new Promise(resolve => client.on('close', resolve));
    client.close();
    
    // Wait for close event
    await closePromise;
    expect(client.readyState).toBe(WebSocket.CLOSED);
  });

  test('should expose metrics endpoint', async () => {
    const response = await fetch(`${METRICS_URL}/metrics`);
    const text = await response.text();
    
    expect(response.status).toBe(200);
    expect(text).toContain('websocket_active_connections');
    expect(text).toContain('websocket_messages_total');
  });

  test('should expose health check endpoint', async () => {
    const response = await fetch(`${METRICS_URL}/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
  });

  test('should track connection metrics', async () => {
    // Get initial metrics
    const initialMetrics = await fetch(`${METRICS_URL}/metrics`).then(r => r.text());
    const initialConnections = parseInt(initialMetrics.match(/websocket_active_connections (\d+)/)?.[1] || '0');
    
    // Create a new connection
    const client = await createClient();
    clients.push(client);
    
    // Wait for metrics to update
    await sleep(100);
    
    // Get updated metrics
    const updatedMetrics = await fetch(`${METRICS_URL}/metrics`).then(r => r.text());
    const updatedConnections = parseInt(updatedMetrics.match(/websocket_active_connections (\d+)/)?.[1] || '0');
    
    expect(updatedConnections).toBe(initialConnections + 1);
  });

  test('should track message metrics', async () => {
    const client = await createClient();
    clients.push(client);
    
    // Get initial metrics
    const initialMetrics = await fetch(`${METRICS_URL}/metrics`).then(r => r.text());
    const initialMessages = parseInt(initialMetrics.match(/websocket_messages_total\{type="received"\} (\d+)/)?.[1] || '0');
    
    // Send a message
    await sendAndWait(client, 'test message');
    
    // Wait for metrics to update
    await sleep(100);
    
    // Get updated metrics
    const updatedMetrics = await fetch(`${METRICS_URL}/metrics`).then(r => r.text());
    const updatedMessages = parseInt(updatedMetrics.match(/websocket_messages_total\{type="received"\} (\d+)/)?.[1] || '0');
    
    expect(updatedMessages).toBe(initialMessages + 1);
  });
});
