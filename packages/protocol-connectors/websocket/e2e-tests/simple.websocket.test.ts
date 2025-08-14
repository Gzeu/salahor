import { test, expect } from '@playwright/test';
import { createServer } from 'http';
import { createWebSocketServer } from '../src/server';
import { WebSocket } from 'ws';

test.describe('Simple WebSocket Server Test', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsServer: any;
  let testPort: number;
  const testPath = '/ws';
  let testUrl: string;

  test.beforeAll(async () => {
    console.log('Setting up test environment...');
    
    // Create HTTP server
    httpServer = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('WebSocket Server');
    });
    
    // Get available port
    testPort = await new Promise<number>((resolve) => {
      httpServer.listen(0, 'localhost', () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          resolve(address.port);
        } else {
          throw new Error('Could not get server port');
        }
      });
    });
    
    testUrl = `ws://localhost:${testPort}${testPath}`;
    console.log(`Test WebSocket URL: ${testUrl}`);
    
      // Create WebSocket server
    try {
      console.log('Creating WebSocket server...');
      const serverOptions = {
        server: httpServer,
        path: testPath,
        wsOptions: {
          clientTracking: true,
        },
      };
      console.log('Calling createWebSocketServer with options:', JSON.stringify(serverOptions, null, 2));
      
      // Call the function and log the result
      const result = await createWebSocketServer(serverOptions);
      console.log('createWebSocketServer result:', result ? 'Received result' : 'Result is null/undefined');
      console.log('Result type:', typeof result);
      console.log('Result keys:', result ? Object.keys(result) : 'No keys (result is null/undefined)');
      
      if (!result) {
        throw new Error('createWebSocketServer returned null or undefined');
      }
      
      // Check if start method exists
      if (typeof result.start === 'function') {
        console.log('Starting WebSocket server...');
        await result.start();
        console.log('WebSocket server started successfully');
      } else {
        console.warn('WebSocket server does not have a start method, assuming it starts automatically');
      }
      
      // Assign the result to wsServer
      wsServer = result;
      console.log('WebSocket server created and started');
    } catch (error) {
      console.error('Error creating WebSocket server:', error);
      throw error;
    }
  });

  test.afterAll(async () => {
    console.log('Tearing down test environment...');
    
    // Close WebSocket server
    if (wsServer) {
      console.log('Closing WebSocket server...');
      try {
        await wsServer.close();
        console.log('WebSocket server closed');
      } catch (error) {
        console.error('Error closing WebSocket server:', error);
      }
    }
    
    // Close HTTP server
    if (httpServer) {
      console.log('Closing HTTP server...');
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
        
        // Force close after timeout
        setTimeout(() => {
          console.log('Forcing HTTP server close');
          resolve();
        }, 5000);
      });
    }
  });

  test('should create a WebSocket server', () => {
    console.log('Running test: should create a WebSocket server');
    expect(wsServer).toBeDefined();
    expect(wsServer).not.toBeNull();
  });

  test('should accept WebSocket connections', async () => {
    console.log('Running test: should accept WebSocket connections');
    
    // Skip this test if server creation failed
    if (!wsServer) {
      console.log('Skipping test - WebSocket server not available');
      return;
    }
    
    // Test WebSocket connection
    const ws = new WebSocket(testUrl);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.on('open', () => {
        console.log('WebSocket connection established');
        clearTimeout(timeout);
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    expect(true).toBe(true); // If we get here, the test passed
  });
});
