import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import createWebSocketServer from '../src/server';
import type { WebSocketServer, WebSocketConnection } from '../src/types';
import { TestWebSocket } from './utils';

// Extend the test timeout for CI environments
const TEST_TIMEOUT = process.env.CI ? 30000 : 10000;

describe('WebSocket Server - Additional Tests', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wss: WebSocketServer | null = null;
  let port: number;
  let connections: WebSocketConnection[] = [];
  
  // Helper function to create a test client with timeout
  async function createTestClient(timeout = 3000): Promise<WebSocket> {
    const ws = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Connection timeout after ${timeout}ms`)),
        timeout
      );
      
      ws.on('open', () => {
        clearTimeout(timer);
        resolve();
      });
      
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    
    return ws;
  }

  beforeAll(async () => {
    console.log('[Test] Setting up HTTP server...');
    httpServer = createServer();
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('HTTP server setup timed out'));
      }, 5000);
      
      httpServer.on('error', reject);
      
      httpServer.listen(0, 'localhost', () => {
        const address = httpServer.address();
        port = typeof address === 'string' 
          ? parseInt(address.split(':').pop() || '0', 10) 
          : (address?.port || 0);
        clearTimeout(timeout);
        resolve();
      });
    });
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    connections = [];
    
    wss = await createWebSocketServer({
      server: httpServer,
      onConnection: (conn) => {
        connections.push(conn);
      },
    });
    
    await wss.start();
  });

  afterEach(async () => {
    if (wss) {
      await wss.stop();
      wss = null;
    }
    connections = [];
  });

  afterAll((done) => {
    httpServer.close(() => {
      httpServer = null as any;
      done();
    });
  }, TEST_TIMEOUT);

  it('should handle large message payloads', async () => {
    const client = await createTestClient();
    const largeMessage = 'x'.repeat(1024 * 1024); // 1MB message
    
    const messagePromise = new Promise<string>((resolve) => {
      client.on('message', (data) => {
        resolve(data.toString());
      });
    });
    
    client.send(largeMessage);
    const response = await messagePromise;
    
    expect(response).toBe(largeMessage);
    client.close();
  }, TEST_TIMEOUT);

  it('should handle binary data', async () => {
    const client = await createTestClient();
    const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
    
    const messagePromise = new Promise<Buffer>((resolve) => {
      client.on('message', (data) => {
        resolve(Buffer.from(data as ArrayBuffer));
      });
    });
    
    client.send(binaryData);
    const response = await messagePromise;
    
    expect(Buffer.compare(response, binaryData)).toBe(0);
    client.close();
  }, TEST_TIMEOUT);

  it('should handle rapid sequential messages', async () => {
    const client = await createTestClient();
    const messageCount = 100;
    const receivedMessages: string[] = [];
    
    const allMessagesReceived = new Promise<void>((resolve) => {
      let count = 0;
      client.on('message', (data) => {
        receivedMessages.push(data.toString());
        if (++count === messageCount) {
          resolve();
        }
      });
    });
    
    // Send messages rapidly
    for (let i = 0; i < messageCount; i++) {
      client.send(`message-${i}`);
    }
    
    await allMessagesReceived;
    expect(receivedMessages.length).toBe(messageCount);
    
    // Verify all messages were received in order
    receivedMessages.forEach((msg, i) => {
      expect(msg).toBe(`message-${i}`);
    });
    
    client.close();
  }, TEST_TIMEOUT * 2);

  it('should handle connection errors gracefully', async () => {
    const invalidClient = new WebSocket(`ws://localhost:${port}`);
    
    const errorPromise = new Promise<Error>((resolve) => {
      invalidClient.on('error', resolve);
    });
    
    // Force an error by closing the server while connecting
    await wss.stop();
    
    const error = await errorPromise;
    expect(error).toBeDefined();
    
    // Verify the server can be restarted after an error
    wss = await createWebSocketServer({ server: httpServer });
    await wss.start();
    
    // Verify new connections work
    const client = await createTestClient();
    expect(client.readyState).toBe(WebSocket.OPEN);
    client.close();
  }, TEST_TIMEOUT);

  it('should handle multiple connection attempts', async () => {
    const connectionPromises = Array(10).fill(0).map(() => createTestClient());
    const clients = await Promise.all(connectionPromises);
    
    // Verify all clients are connected
    clients.forEach(client => {
      expect(client.readyState).toBe(WebSocket.OPEN);
    });
    
    // Clean up
    await Promise.all(clients.map(client => 
      new Promise(resolve => client.close(1000, 'test complete', resolve))
    ));
  }, TEST_TIMEOUT * 2);

  it('should handle ping/pong frames', async () => {
    const client = await createTestClient();
    const pingData = Buffer.from('ping');
    
    const pongPromise = new Promise<Buffer>((resolve) => {
      client.on('pong', (data) => {
        resolve(data);
      });
    });
    
    client.ping(pingData);
    const pongData = await pongPromise;
    
    expect(Buffer.compare(pongData, pingData)).toBe(0);
    client.close();
  }, TEST_TIMEOUT);
});
