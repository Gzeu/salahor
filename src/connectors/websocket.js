/**
 * WebSocket Connector
 * 
 * Provides bi-directional communication between WebSocket clients and servers
 * with automatic reconnection and message buffering.
 */

import { createAsyncQueue } from '../core/asyncQueue.js';
import { AbortError } from '../errors.js';

/**
 * Creates a WebSocket client that connects to a WebSocket server
 * @param {string} url - WebSocket server URL
 * @param {Object} [options] - Connection options
 * @param {number} [options.reconnectDelay=1000] - Delay between reconnection attempts in ms
 * @param {number} [options.maxReconnectAttempts=5] - Maximum number of reconnection attempts (0 for unlimited)
 * @param {boolean} [options.binaryType='blob'] - Binary type ('blob' or 'arraybuffer')
 * @param {AbortSignal} [options.signal] - AbortSignal to close the connection
 * @returns {Object} - Object with send method and async iterable for receiving messages
 */
export function createWebSocketClient(url, {
  reconnectDelay = 1000,
  maxReconnectAttempts = 5,
  binaryType = 'blob',
  signal
} = {}) {
  let socket;
  let reconnectAttempts = 0;
  let reconnectTimeout;
  const queue = createAsyncQueue();
  const messageQueue = [];
  const subscribers = new Set();
  let isConnected = false;

  const connect = async () => {
    if (signal?.aborted) {
      throw new AbortError('Connection aborted');
    }

    return new Promise((resolve, reject) => {
      try {
        socket = new WebSocket(url);
        
        socket.binaryType = binaryType;

        socket.onopen = () => {
          isConnected = true;
          reconnectAttempts = 0;
          // Process any queued messages
          while (messageQueue.length > 0 && isConnected) {
            const message = messageQueue.shift();
            socket.send(message);
          }
          resolve();
        };

        socket.onmessage = (event) => {
          queue.enqueue(event.data);
          // Notify all subscribers
          for (const subscriber of subscribers) {
            try {
              subscriber(event.data);
            } catch (err) {
              console.error('Error in WebSocket subscriber:', err);
            }
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (!isConnected) {
            reject(error);
          }
        };

        socket.onclose = () => {
          isConnected = false;
          if (signal?.aborted) {
            queue.close();
            return;
          }
          
          if (maxReconnectAttempts === 0 || reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts || '∞'})...`);
            reconnectTimeout = setTimeout(connect, reconnectDelay);
          } else {
            queue.close(new Error('Max reconnection attempts reached'));
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  // Handle abort signal
  if (signal) {
    signal.addEventListener('abort', () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close();
      }
      queue.close(new AbortError('Connection aborted'));
    });
  }

  // Start connection
  connect().catch(err => {
    console.error('WebSocket connection failed:', err);
    queue.close(err);
  });

  return {
    /**
     * Send data through the WebSocket
     * @param {string|ArrayBuffer|Blob} data - Data to send
     */
    send: (data) => {
      if (isConnected && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      } else {
        messageQueue.push(data);
        if (!isConnected && !reconnectTimeout) {
          connect().catch(console.error);
        }
      }
    },

    /**
     * Async iterable for receiving messages
     */
    messages: {
      [Symbol.asyncIterator]: () => queue[Symbol.asyncIterator](),
      
      /**
       * Subscribe to receive messages via callback
       * @param {(data: any) => void} callback - Function to call on each message
       * @returns {() => void} Unsubscribe function
       */
      subscribe: (callback) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      }
    },

    /**
     * Close the WebSocket connection
     * @param {number} [code] - Close code
     * @param {string} [reason] - Close reason
     */
    close: (code, reason) => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close(code, reason);
      }
      queue.close();
    },

    /**
     * Current connection state
     */
    get readyState() {
      return isConnected ? 'connected' : 'disconnected';
    },

    /**
     * Reconnect the WebSocket
     */
    reconnect: () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close();
      return connect();
    }
  };
}

// Export for Node.js environment
let WebSocketServer;
let createServer;

// Lazy load Node.js modules
const loadNodeModules = async () => {
  if (typeof window === 'undefined' && !WebSocketServer) {
    const http = await import('node:http');
    const ws = await import('ws');
    WebSocketServer = ws.WebSocketServer;
    createServer = http.createServer;
    return true;
  }
  return false;
};

// Create a no-op function for browser environment
const noop = () => {
  throw new Error('This function is only available in Node.js environment');
};

// Export server-related functions with lazy loading
export const createWebSocketServer = typeof window === 'undefined' 
  ? async (options = {}) => {
      await loadNodeModules();
      
      const {
        port = 8080,
        host = 'localhost',
        signal
      } = options;
      
      const httpServer = createServer();
      const wss = new WebSocketServer({ server: httpServer });
      const clients = new Set();
      let isClosed = false;

      const broadcast = (data) => {
        if (isClosed) return;
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        for (const client of clients) {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
          }
        }
      };

      const close = () => {
        if (isClosed) return Promise.resolve();
        isClosed = true;
        
        return new Promise((resolve) => {
          // Close all clients
          for (const client of clients) {
            if (client.readyState === 1) { // 1 = OPEN
              client.close();
            }
          }
          clients.clear();
          
          // Close the WebSocket server
          wss.close(() => {
            // Close the HTTP server
            httpServer.close(resolve);
          });
        });
      };

      // Handle new connections
      wss.on('connection', (ws) => {
        if (isClosed) {
          ws.close();
          return;
        }

        clients.add(ws);
        
        ws.on('close', () => {
          clients.delete(ws);
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          clients.delete(ws);
        });
      });

      // Handle server close on abort signal
      if (signal) {
        signal.addEventListener('abort', () => close(), { once: true });
      }

      // Start listening
      return new Promise((resolve, reject) => {
        httpServer.on('error', reject);
        
        httpServer.listen(port, host, () => {
          httpServer.off('error', reject);
          
          resolve({
            broadcast,
            close,
            get clientCount() {
              return clients.size;
            },
            http: httpServer,
            ws: wss
          });
        });
      });
    }
  : noop;

export const createHybridServer = typeof window === 'undefined'
  ? async (options = {}) => {
      await loadNodeModules();
      
      const {
        port = 8080,
        host = 'localhost',
        onRequest,
        signal
      } = options;
      
      const httpServer = createServer((req, res) => {
        if (onRequest) {
          onRequest(req, res);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('WebSocket server is running');
        }
      });

      const wss = new WebSocketServer({ noServer: true });
      const clients = new Set();
      let isClosed = false;

      const broadcast = (data) => {
        if (isClosed) return;
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        for (const client of clients) {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(message);
          }
        }
      };

      const close = () => {
        if (isClosed) return Promise.resolve();
        isClosed = true;
        
        return new Promise((resolve) => {
          // Close all clients
          for (const client of clients) {
            if (client.readyState === 1) { // 1 = OPEN
              client.close();
            }
          }
          clients.clear();
          
          // Close the WebSocket server
          wss.close(() => {
            // Close the HTTP server
            httpServer.close(resolve);
          });
        });
      };

      // Handle WebSocket upgrade
      httpServer.on('upgrade', (request, socket, head) => {
        if (isClosed) {
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      });

      // Handle new WebSocket connections
      wss.on('connection', (ws) => {
        if (isClosed) {
          ws.close();
          return;
        }

        clients.add(ws);
        
        ws.on('message', (message) => {
          ws.send(`Server received: ${message}`);
        });
        
        ws.on('close', () => {
          clients.delete(ws);
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          clients.delete(ws);
        });
      });

      // Handle server close on abort signal
      if (signal) {
        signal.addEventListener('abort', () => close(), { once: true });
      }

      // Start listening
      return new Promise((resolve, reject) => {
        httpServer.on('error', reject);
        
        httpServer.listen(port, host, () => {
          httpServer.off('error', reject);
          
          resolve({
            broadcast,
            close,
            get clientCount() {
              return clients.size;
            },
            http: httpServer,
            ws: wss
          });
        });
      });
    }
  : noop;
