import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import createWebSocketServer from '../src/server';
import type { WebSocketServer, WebSocketConnection } from '../src/types';
import { TestWebSocket } from './utils';

// Define a proper Unsubscribe type that includes the unsubscribe method
interface Unsubscribe {
  (): void;
  unsubscribe?: () => void;
}

// The mock is now in __mocks__/ws.ts

describe('WebSocket Server', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wss: WebSocketServer | null = null;
  let port: number;
  let connections: WebSocketConnection[] = [];
  let connectionSubscription: Unsubscribe | null = null;
  
  // Helper function to create a test client
  async function createTestClient() {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 3000);
      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      ws.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
    });
    return ws;
  }

  beforeAll(async () => {
    console.log('[Test] Setting up HTTP server...');
    // Create a simple HTTP server
    httpServer = createServer();
    
    // Start the server on a random available port
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('HTTP server setup timed out'));
      }, 5000);
      
      httpServer.on('error', (error) => {
        console.error('[Test] HTTP server error:', error);
        clearTimeout(timeout);
        reject(error);
      });
      
      httpServer.listen(0, 'localhost', () => {
        const address = httpServer.address();
        port = typeof address === 'string' ? parseInt(address.split(':').pop() || '0', 10) : (address?.port || 0);
        console.log(`[Test] HTTP server listening on port ${port}`);
        clearTimeout(timeout);
        resolve();
      });
    });
  }, 10000); // Increase timeout for server startup

  beforeEach(async () => {
    console.log('[Test] Starting test setup...');
    // Reset connections array
    connections = [];
    
    try {
      console.log('[Test] Creating WebSocket server...');
      // Create a new WebSocket server for each test
      const startTime = Date.now();
      const createPromise = createWebSocketServer({
        server: httpServer,
      });
      
      // Add a timeout to the WebSocket server creation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('WebSocket server creation timed out after 5000ms'));
        }, 5000);
      });
      
      // Race the WebSocket server creation against the timeout
      wss = await Promise.race([createPromise, timeoutPromise]);
      
      const elapsed = Date.now() - startTime;
      console.log(`[Test] WebSocket server created in ${elapsed}ms`);

      // Start the WebSocket server
      if (wss) {
        console.log('[Test] Starting WebSocket server...');
        try {
          await wss.start();
          console.log('[Test] WebSocket server started successfully');
          
          console.log('[Test] Setting up connection subscription...');
          // Store the subscription to clean up later
          connectionSubscription = wss.connections.subscribe((connection: WebSocketConnection) => {
            console.log(`[Test] New connection: ${connection.id} from ${connection.remoteAddress}`);
            connections.push(connection);
            
            // Set up error handler for the connection
            const errorSubscription = connection.onError.subscribe((error: Event) => {
              console.error(`[Test] Error in connection ${connection.id}:`, error);
            });
            
            // Set up close handler for the connection
            connection.onClose.then((event: CloseEvent) => {
              console.log(`[Test] Connection ${connection.id} closed:`, event.code, event.reason);
              errorSubscription.unsubscribe();
            }).catch((error: Error) => {
              console.error(`[Test] Error in connection ${connection.id} close handler:`, error);
            });
          });
          console.log('[Test] Connection subscription set up');
        } catch (startError) {
          console.error('[Test] Error starting WebSocket server:', startError);
          throw startError;
        }
      } else {
        console.error('[Test] Failed to create WebSocket server: wss is null');
        throw new Error('WebSocket server creation failed: wss is null');
      }
    } catch (error) {
      console.error('[Test] Error in test setup:', error);
      throw error;
    }
  }, 10000); // Increase timeout for WebSocket server setup

  afterEach(async () => {
    // Clean up all connections after each test
    await Promise.all(connections.map(conn => conn.close()));
    connections = [];
    
    // Clean up the server
    if (wss) {
      await wss.close();
      wss = null;
    }
    
    // Clean up the subscription
    if (connectionSubscription) {
      // Call the unsubscribe method if it exists, otherwise call the function directly
      if (typeof connectionSubscription.unsubscribe === 'function') {
        connectionSubscription.unsubscribe();
      } else if (typeof connectionSubscription === 'function') {
        connectionSubscription();
      }
      connectionSubscription = null;
    }
  });

  afterAll(async () => {
    // Close the HTTP server
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  });

  it('should initialize WebSocket server', () => {
    expect(wss).toBeDefined();
    expect(wss?.connections).toBeDefined();
  });

  it('should handle client connections', async () => {
    expect(wss).toBeDefined();
    
    // Create a test client
    const ws = await createTestClient();
    
    // Verify the connection was established
    expect(connections.length).toBe(1);
    
    // Clean up
    ws.close();
  });

  it('should receive messages from clients', async () => {
    const ws = await createTestClient();
    const connection = connections[0];
    
    // Set up a message listener using the messages event stream
    const messagePromise = new Promise<string>((resolve) => {
      const subscription = connection.messages.subscribe((data) => {
        resolve(data.toString());
        // Call the subscription to unsubscribe
        subscription();
      });
    });
    
    // Send a message from the client
    ws.send('test message');
    
    // Verify the message was received
    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBe('test message');
    
    // Clean up
    ws.close();
  });

  it('should handle client disconnections', async () => {
    const ws = await createTestClient();
    const connection = connections[0];
    
    // Set up a close listener using the onClose promise
    const closePromise = connection.onClose.then(() => {
      // Connection closed
    });
    
    // Close the client connection
    ws.close();
    
    // Wait for the close event
    await closePromise;
    
    // Verify the connection was closed
    expect(connection.readyState).toBe(3); // CLOSED
  });

  it('should broadcast messages to all clients', async () => {
    // Create two clients
    const client1 = await createTestClient();
    const client2 = await createTestClient();
    
    // Set up message listeners
    const client1Messages: string[] = [];
    const client2Messages: string[] = [];
    
    const subscription1 = connections[0].messages.subscribe((data) => {
      client1Messages.push(data.toString());
    });
    
    const subscription2 = connections[1].messages.subscribe((data) => {
      client2Messages.push(data.toString());
    });
    
    // Send a message from the server to all clients
    const broadcastMessage = 'Broadcast message';
    connections.forEach((conn: WebSocketConnection) => {
      conn.send(broadcastMessage);
    });
    
    // Wait for messages to be received
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify both clients received the message
    expect(client1Messages).toContain(broadcastMessage);
    expect(client2Messages).toContain(broadcastMessage);
    
    // Clean up
    subscription1();
    subscription2();
    client1.close();
    client2.close();
  });

  afterAll(async () => {
    // Close the HTTP server
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Clean up any remaining WebSocket instances
    TestWebSocket.instances = [];
  });
  
  it('should handle client connections', async () => {
    expect(wss).toBeDefined();
    
    // Create a test client
    const ws = await createTestClient();
    
    // Verify the connection was established
    expect(TestWebSocket.instances.length).toBe(1);
    const testWs = TestWebSocket.instances[0];
    expect(testWs.isOpen).toBe(true);
    
    // Clean up
    ws.close();
  });
  
  it('should receive messages from clients', async () => {
    const ws = await createTestClient();
    const testWs = TestWebSocket.instances[0];
    
    // Set up a message listener
    const messagePromise = new Promise((resolve) => {
      ws.onmessage = (event) => {
        resolve(event.data);
      };
    });
    
    // Simulate a message from the server
    testWs.simulateMessage('test message');
    
    // Verify the message was received
    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBe('test message');
    
    // Clean up
    ws.close();
  });
  
  it('should handle client disconnections', async () => {
    const ws = await createTestClient();
    const testWs = TestWebSocket.instances[0];
    
    // Set up a close listener
    const closePromise = new Promise((resolve) => {
      ws.onclose = () => resolve(true);
    });
    
    // Simulate a client disconnection
    testWs.simulateClose(1000, 'test close');
    
    // Verify the connection was closed
    const wasClosed = await closePromise;
    // Verify we have a connection
    expect(connections.length).toBe(1);
    const connection = connections[0];
    
    // Test sending a message from client to server
    const messagePromise = new Promise<string>((resolve) => {
      const subscription = connection.messages.subscribe((msg) => {
        subscription.unsubscribe();
        resolve(msg);
      });
    });
    
    // Simulate a message from the client
    testWs.simulateMessage('test message');
    
    // Verify the server received the message
    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBe('test message');
    
    // Test sending a message from server to client
    const clientMessagePromise = new Promise<string>((resolve) => {
      testWs.onmessage = (event: { data: string }) => {
        resolve(event.data);
      };
    });
    
    // Send a message from the server
    const serverMessage = 'Hello from the server!';
    connection.send(serverMessage);
    
    // Verify the client received the message
    const clientReceivedMessage = await clientMessagePromise;
    expect(clientReceivedMessage).toBe(serverMessage);
    
    // Test client disconnection
    const clientClosePromise = new Promise<{code: number; reason: string}>((resolve) => {
      testWs.onclose = (event: { code: number; reason: string }) => {
        resolve({
          code: event.code,
          reason: event.reason
        });
      };
    });
    
    // Simulate a client disconnection
    testWs.simulateClose(1000, 'test close');
    
    // Verify the connection was closed
    const closeResult = await clientClosePromise;
    expect(closeResult.code).toBe(1000);
    expect(closeResult.reason).toBe('test close');
    expect(testWs.isClosed).toBe(true);
  });

  it('should broadcast messages to all clients', async () => {
    // Set up broadcast handler
    const subscriptions = connections.map(conn => 
      conn.messages.subscribe((msg: string | ArrayBuffer | Blob) => {
        // Broadcast to all connections except the sender
        connections.forEach(c => {
          if (c !== conn) {
            c.send(`Echo: ${msg}`);
          }
        });
      })
    );
    
    // Clean up subscriptions after test
    afterAll(() => {
      subscriptions.forEach(sub => (sub as any)());
    });

    // Create first client
    const client1 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => { client1.onopen = () => resolve(); });

    // Create second client
    const client2 = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => { client2.onopen = () => resolve(); });

    // Set up message handlers
    const client1Messages: string[] = [];
    const client2Messages: string[] = [];

    const client1Promise = new Promise<string[]>((resolve) => {
      client1.onmessage = (event) => {
        client1Messages.push(event.data as string);
        if (client1Messages.length >= 2) resolve(client1Messages);
      };
    });

    const client2Promise = new Promise<string[]>((resolve) => {
      client2.onmessage = (event) => {
        client2Messages.push(event.data as string);
        if (client2Messages.length >= 2) resolve(client2Messages);
      };
    });

    // Send messages from both clients
    client1.send('Hello from client 1');
    client2.send('Hello from client 2');

    // Wait for all messages to be received
    const [client1Msgs, client2Msgs] = await Promise.all([
      client1Promise,
      client2Promise
    ]);

    // Verify messages were received correctly
    expect(client1Msgs.some(msg => msg === 'Echo: Hello from client 2')).toBe(true);
    expect(client2Msgs.some(msg => msg === 'Echo: Hello from client 1')).toBe(true);

    // Clean up
    client1.close();
    client2.close();
    await Promise.all([
      new Promise(resolve => { client1.onclose = resolve; }),
      new Promise(resolve => { client2.onclose = resolve; })
    ]);
  });

  it('should handle client disconnections', async () => {
    // Create a client and connect
    const client = new WebSocket(`ws://localhost:${port}`);
    await new Promise<void>((resolve) => { client.onopen = () => resolve(); });
    
    // Verify we have a connection
    expect(connections.length).toBe(1);
    const connection = connections[0];
    
    // Set up a promise to detect when the connection is closed
    const closePromise = new Promise<{code: number, reason: string}>((resolve) => {
      client.onclose = (event) => {
        resolve({
          code: event.code,
          reason: event.reason
        });
      };
    });
    
    // Close the client with a custom code and reason
    const closeCode = 1000;
    const closeReason = 'Test disconnection';
    client.close(closeCode, closeReason);
    
    // Wait for the close event
    const closeEvent = await closePromise;
    
    // Verify the connection is marked as closed
    expect(closeEvent.code).toBe(closeCode);
    expect(closeEvent.reason).toBe(closeReason);
    
    // The connection should be removed from the connections array
    // after a short delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(connections).not.toContain(connection);
  });
});
