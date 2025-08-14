import { test, expect } from '@playwright/test';
import { createServer } from 'http';
import { createWebSocketServer } from '../src/server';
import { WebSocket } from 'ws';

test.describe('Minimal WebSocket Server Test', () => {
  let server: ReturnType<typeof createServer>;
  let wsServer: any;
  let testPort: number;
  const testPath = '/ws';
  let testUrl: string;

  test.beforeAll(async () => {
    console.log('Setting up test environment...');
    
    // Create HTTP server
    server = createServer();
    
    // Get available port
    testPort = await new Promise<number>((resolve) => {
      server.listen(0, 'localhost', () => {
        const address = server.address();
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
      wsServer = await createWebSocketServer({
        server,
        port: testPort,
        wsOptions: {
          clientTracking: true,
          path: testPath,
        },
      });
      console.log('WebSocket server created:', wsServer ? 'Success' : 'Failed');
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
    if (server) {
      console.log('Closing HTTP server...');
      await new Promise<void>((resolve) => {
        server.close(() => {
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
