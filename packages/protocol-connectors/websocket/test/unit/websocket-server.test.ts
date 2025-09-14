import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer, Server } from 'http';
import { WebSocket } from 'ws';
import { createWebSocketServer } from '../../src/server';
import type { WebSocketServer, WebSocketConnection } from '../../src/types';

// Increase test timeout for CI environments
const TEST_TIMEOUT = process.env.CI ? 30000 : 10000;

// Helper to get an available port
function getPort(): number {
  return 3000 + Math.floor(Math.random() * 1000);
}

describe('WebSocket Server', () => {
  let httpServer: Server;
  let wss: WebSocketServer | null = null;
  let port: number;
  let connections: WebSocketConnection[] = [];

  // Helper function to create a test client
  async function createTestClient(): Promise<WebSocket> {
    const ws = new WebSocket(`ws://localhost:${port}`);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 3000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    return ws;
  }

  // Helper function to wait for a message
  function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      const onMessage = (data: WebSocket.Data) => {
        const message = data instanceof Buffer ? data.toString() : data;
        ws.removeListener('message', onMessage);
        resolve(JSON.parse(message as string));
      };
      ws.on('message', onMessage);
    });
  }

  beforeAll(async () => {
    // Create a simple HTTP server
    httpServer = createServer();
    port = getPort();
    
    // Start the server on the specified port
    await new Promise<void>((resolve) => {
      httpServer.listen(port, '127.0.0.1', resolve);
    });
    
    // Create WebSocket server
    wss = createWebSocketServer({ server: httpServer });
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Reset connections array
    connections = [];
    
    // Create a new WebSocket server for each test
    wss = await createWebSocketServer({
      server: httpServer,
    });
    
    // Track connections
    wss.connections.subscribe({
      next: (connection) => {
        if (connection) {
          connections.push(connection);
        }
      },
      error: (error) => {
        console.error('Connection error:', error);
      },
    });
  });

  afterEach(async () => {
    // Close the WebSocket server
    if (wss) {
      await wss.close();
      wss = null;
    }
    
    // Clear any remaining connections
    connections = [];
  });

  afterAll(async () => {
    // Close the HTTP server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  }, TEST_TIMEOUT);

  it('should create a WebSocket server', () => {
    expect(wss).toBeDefined();
  });

  it('should handle client connections', async () => {
    const client = await createTestClient();
    expect(connections.length).toBe(1);
    await client.close();
  });

  it('should send and receive messages', async () => {
    const client = await createTestClient();
    const connection = connections[0];
    
    // Test sending from server to client
    const serverMessage = { type: 'test', data: 'Hello from server' };
    const clientMessagePromise = waitForMessage(client);
    connection.send(JSON.stringify(serverMessage));
    const receivedClientMessage = await clientMessagePromise;
    expect(receivedClientMessage).toEqual(serverMessage);
    
    // Test sending from client to server
    const clientMessage = { type: 'test', data: 'Hello from client' };
    const serverMessagePromise = new Promise<Record<string, unknown>>((resolve) => {
      const onMessage = (data: string | ArrayBuffer | Blob) => {
        connection.messages.offValue(onMessage);
        const message = data instanceof Blob ? data.text() : data.toString();
        resolve(JSON.parse(message));
      };
      connection.messages.onValue(onMessage);
    });
    
    client.send(JSON.stringify(clientMessage));
    const receivedServerMessage = await serverMessagePromise;
    expect(receivedServerMessage).toEqual(clientMessage);
    
    await client.close();
  }, TEST_TIMEOUT);

  it('should handle client disconnection', async () => {
    const client = await createTestClient();
    expect(connections.length).toBe(1);
    
    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      const connection = connections[0];
      const onClose = () => {
        connection.onClose.then((closeEvent: CloseEvent) => {
          resolve({ 
            code: closeEvent.code, 
            reason: closeEvent.reason 
          });
        });
      };
      
      if (connection.isOpen) {
        onClose();
      } else {
        const unsubscribe = connection.messages.onValue(() => {
          if (connection.isOpen) {
            unsubscribe();
            onClose();
          }
        });
      }
    });
    
    await client.close();
    const closeResult = await closePromise;
    
    expect(closeResult.code).toBe(1000); // Normal closure
    // Wait a bit for connection cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(connections.length).toBe(0);
  }, TEST_TIMEOUT);
});
