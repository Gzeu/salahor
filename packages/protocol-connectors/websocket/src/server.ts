import { createEventStream } from '@salahor/core';
import type { Server as WSServer, ServerOptions as WSServerOptions, WebSocket as WSSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { AddressInfo } from 'net';
import type { WebSocketServer as IWebSocketServer, WebSocketServerOptions, WebSocketConnection } from './types';
import { devLogger, isDev } from './utils';

// Type guard to check if a value is a WebSocket server
function isWebSocketServer(server: any): server is WSServer {
  return server && 
         typeof server.on === 'function' && 
         typeof server.close === 'function';
}

// Type guard to check if a value is a Node.js HTTP server
function isHttpServer(server: any): server is HttpServer | HttpsServer {
  return server && 
         typeof server.listen === 'function' && 
         typeof server.close === 'function';
}

// Extend WebSocket interface to include isAlive property
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}

// Type guard for WebSocket connection
function isWebSocketConnection(connection: any): connection is WebSocketConnection {
  return connection && 
         typeof connection.send === 'function' && 
         typeof connection.close === 'function' &&
         'isOpen' in connection;
}

/**
 * Creates a WebSocket connection wrapper
 */
function createWebSocketConnection(ws: WSSocket, request: any): WebSocketConnection {
  const id = Math.random().toString(36).substring(2, 15);
  const remoteAddress = request.socket?.remoteAddress || 'unknown';
  const messages = createEventStream<string | ArrayBuffer | Blob>();
  const errorEvents = createEventStream<Event>();
  let isOpen = true;
  
  // Set up message handler
  ws.on('message', (data: string | Buffer | ArrayBuffer | Buffer[]) => {
    // Convert Buffer to ArrayBuffer if needed
    const message = data instanceof Buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
    messages.emit(message as string | ArrayBuffer | Blob);
  });
  
  // Set up error handler
  ws.on('error', (error: Event) => {
    errorEvents.emit(error);
  });
  
  const closePromise = new Promise<CloseEvent>((resolve) => {
    const onClose = (code: number, reason: Buffer) => {
      isOpen = false;
      messages.complete();
      errorEvents.complete();
      
      // Create a CloseEvent-like object
      const event = new CloseEvent('close', {
        wasClean: true,
        code,
        reason: reason?.toString() || ''
      });
      
      resolve(event);
    };
    
    ws.on('close', onClose);
  });
  
  const connection: WebSocketConnection = {
    get socket() { return ws as unknown as WebSocket; },
    get id() { return id; },
    get remoteAddress() { return remoteAddress; },
    get messages() { return messages; },
    get isOpen() { return isOpen; },
    get readyState() { 
      // Map internal ws readyState to standard WebSocket readyState values
      switch (ws.readyState) {
        case 0: return 0; // CONNECTING
        case 1: return 1; // OPEN
        case 2: return 2; // CLOSING
        case 3: return 3; // CLOSED
        default: return 3; // Default to CLOSED for unknown states
      }
    },
    get onClose() { return closePromise; },
    get onError() { return errorEvents; },
    send(data: string | ArrayBuffer | Blob) {
      if (isOpen) {
        try {
          ws.send(data as any);
        } catch (error) {
          console.error(`[WebSocketServer] Error sending to client ${id}:`, error);
          throw error;
        }
      }
    },
    close(code?: number, reason?: string) {
      if (isOpen) {
        isOpen = false;
        ws.close(code, reason);
      }
    }
  };
  
  return connection;
}

/**
 * Creates a new WebSocket server instance
 */
export async function createWebSocketServer(
  options: WebSocketServerOptions = {}
): Promise<IWebSocketServer> {
  if (isDev) {
    devLogger.log('[WebSocket] createWebSocketServer called at:', new Date().toISOString());
  }
  console.log('[WebSocket] createWebSocketServer called with options:', JSON.stringify({
    ...options,
    // Don't log the entire server object
    server: options.server ? `[HTTP Server: ${options.server?.listening ? 'listening' : 'not listening'}]` : 'undefined',
  }, null, 2));
  
  // Debug: Log the current working directory
  console.log('[WebSocket] Current working directory:', process.cwd());
  
  // Check if we're running in a test environment
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  console.log('[WebSocket] Is test environment:', isTestEnv);
  
  // Check if we can require the 'ws' module
  let wsModule;
  try {
    wsModule = await import('ws');
    console.log('[WebSocket] Successfully imported ws module');
  } catch (error) {
    console.error('[WebSocket] Failed to import ws module:', error);
    throw new Error('Failed to import WebSocket module');
  }
  
  const { 
    port,
    host = '0.0.0.0',
    server: httpServer,
    wsOptions = {},
  } = options;
  
  console.log(`[WebSocket] Extracted options - port: ${port}, host: ${host}, hasHttpServer: ${!!httpServer}`);

  // Server state
  const state = {
    // Event streams
    connections: createEventStream<WebSocketConnection>(),
    onClose: createEventStream<void>(),
    onError: createEventStream<Error>(),
    disconnections: createEventStream<{ connection: WebSocketConnection; code: number; reason: string }>(),
    
    // Connection tracking
    activeConnections: new Map<string, WebSocketConnection>(),
    isClosed: false,
    wss: null as WSServer | null,
    
    // Helper methods
    addConnection: (id: string, connection: WebSocketConnection) => {
      state.activeConnections.set(id, connection);
      state.connections.emit(connection);
    },
    
    removeConnection: (id: string) => {
      state.activeConnections.delete(id);
    },
    
    closeAllConnections: async (code?: number, reason?: string) => {
      const closePromises = Array.from(state.activeConnections.values())
        .map(conn => new Promise<void>((resolve) => {
          try {
            conn.close(code, reason);
          } catch (error) {
            console.error(`Error closing connection ${conn.id}:`, error);
          } finally {
            resolve();
          }
        }));
      
      await Promise.all(closePromises);
      state.activeConnections.clear();
    },
    
    broadcast: (data: string | ArrayBuffer | Blob, excludeId?: string) => {
      state.activeConnections.forEach((conn, id) => {
        if (id !== excludeId && conn.isOpen) {
          try {
            conn.send(data);
          } catch (error) {
            console.error(`Error broadcasting to connection ${id}:`, error);
            state.removeConnection(id);
          }
        }
      });
    }
  };
  
  // Import the WebSocketServer from 'ws' package
  let WebSocketServer;
  
  try {
    console.log('[WebSocket] Attempting to import WebSocketServer...');
    // Try ESM dynamic import first (works in modern Node.js and bundlers)
    const wsModule = await import('ws');
    console.log('[WebSocket] Successfully imported ws module');
    
    // Handle both direct and default exports
    // The WebSocketServer is available as the default export or as a named export
    WebSocketServer = 
      (wsModule as any).WebSocketServer || // Check for named export
      (wsModule as any).default?.WebSocketServer || // Check for default.WebSocketServer
      wsModule.Server || // Check for named Server export
      (wsModule as any).default?.Server; // Check for default.Server
      
    console.log('[WebSocket] WebSocketServer constructor:', WebSocketServer ? 'found' : 'not found');
    
    // Debug logging
    if ((wsModule as any).WebSocketServer) console.log('[WebSocket] Found WebSocketServer in wsModule');
    if ((wsModule as any).default?.WebSocketServer) console.log('[WebSocket] Found WebSocketServer in wsModule.default');
    if (wsModule.Server) console.log('[WebSocket] Found Server in wsModule');
    if ((wsModule as any).default?.Server) console.log('[WebSocket] Found Server in wsModule.default');
  } catch (error) {
    console.error('[WebSocket] Failed to import WebSocketServer:', error);
    throw new Error('Failed to initialize WebSocket server: Missing required WebSocket server implementation');
  }

  if (!WebSocketServer) {
    console.error('[WebSocket] WebSocketServer constructor is null or undefined');
    throw new Error('Failed to find WebSocket server implementation');
  }

  // Create the WebSocket server instance
  let server: WSServer | null = null;
  
  try {
    console.log('[WebSocket] Creating WebSocket server instance...');
    console.log(`[WebSocket] Using httpServer: ${!!httpServer}, port: ${port}, host: ${host}`);
    
    if (httpServer) {
      console.log('[WebSocket] Creating WebSocket server with existing HTTP server');
      server = new WebSocketServer({
        server: httpServer,
        ...wsOptions,
      });
    } else if (port) {
      console.log(`[WebSocket] Creating WebSocket server on port ${port} and host ${host}`);
      server = new WebSocketServer({
        port,
        host,
        ...wsOptions,
      });
    } else {
      const errorMsg = '[WebSocket] Either server or port must be provided';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log('[WebSocket] WebSocket server instance created successfully');
  } catch (error) {
    console.error('[WebSocket] Error creating WebSocket server:', error);
    throw error;
  }

  // Helper function to handle broadcast messages
  async function handleBroadcastMessage(message: string | ArrayBuffer | Blob | ArrayBufferView, sender: WebSocketConnection): Promise<void> {
    if (state.isClosed) return;
    
    const sendPromises: Promise<void>[] = [];
    
    for (const [id, connection] of state.activeConnections.entries()) {
      // Don't send back to the sender
      if (id === sender.id) continue;
      
      // Create a promise for each send operation
      const sendPromise = new Promise<void>((resolve) => {
        try {
          if (connection.isOpen) {
            connection.send(message as string | ArrayBuffer | Blob);
            resolve();
          } else {
            // If connection is closed, remove it from active connections
            state.removeConnection(id);
            resolve();
          }
        } catch (error) {
          console.error(`[WebSocketServer] Error sending to client ${id}:`, error);
          // Remove the connection if there was an error
          state.removeConnection(id);
          resolve(); // Resolve anyway to continue with other connections
        }
      });
      
      sendPromises.push(sendPromise);
    }
    
    // Wait for all send operations to complete
    await Promise.all(sendPromises);
  }

  // Create the WebSocket server API object
  const webSocketServer: IWebSocketServer = {
    async start(serverPort: number = port || 8080): Promise<void> {
      console.log(`[WebSocketServer] Starting server on port ${serverPort}...`);
      
      if (state.server && !state.isClosed) {
        console.log('[WebSocketServer] Server is already running');
        return;
      }

      return new Promise((resolve, reject) => {
        try {
          // Close existing server if it exists
          if (state.server) {
            state.server.close();
          }

          // Create new WebSocket server
          console.log('[WebSocketServer] Creating WebSocket server instance...');
          state.server = new WebSocketServer({ port: serverPort, host, ...wsOptions });
          state.isClosed = false;
          
          console.log(`[WebSocketServer] WebSocket server created, waiting for 'listening' event...`);
          
          // Add a one-time listener for the 'listening' event
          state.server.once('listening', () => {
            const address = state.server?.address();
            const listenPort = typeof address === 'string' ? address : address?.port;
            console.log(`[WebSocketServer] Server is now listening on ${host}:${listenPort}`);
            resolve();
          });
          
          // Add error handler for server errors
          state.server.on('error', (error) => {
            console.error('[WebSocketServer] WebSocket server error:', error);
            reject(error);
          });

          state.server.on('connection', (ws: WSSocket, request: any) => {
            if (state.isClosed) {
              console.log('[WebSocketServer] Rejecting new connection - server is closing');
              ws.close(1013, 'Server is shutting down');
              return;
            }

            const connection = createWebSocketConnection(ws, request);
            state.activeConnections.set(connection.id, connection);
            
            console.log(`[WebSocketServer] New connection: ${connection.id} from ${connection.remoteAddress}`);
            console.log(`[WebSocketServer] Active connections: ${state.activeConnections.size}`);

            // Log all active connections for debugging
            if (state.activeConnections.size % 10 === 0) {
              console.log('[WebSocketServer] Current connection IDs:', 
                Array.from(state.activeConnections.keys()).join(', '));
            }

            // Emit connection event
            state.connections.next(connection);

            // Handle incoming messages from this connection
            const messageSubscription = connection.messages.subscribe({
              next: (message: string | ArrayBuffer | Blob) => {
                try {
        }
      }
    });

    /**
     * Stream of new connections.
     */
    get connections() {
      return state.connections;
    },

    /**
     * Stream of disconnections.
     */
    get disconnections() {
      return state.disconnections;
    },

    /**
     * Map of active connections by connection ID.
     */
    get activeConnections() {
      return new Map(state.activeConnections);
    },

    /**
     * Close the server and all connections.
     */
    async close(): Promise<void> {
      if (isClosed) return;
      
      isClosed = true;
      console.log('[WebSocketServer] Closing server...');
      
      // Close all active connections
      const closePromises = Array.from(activeConnections.values()).map(connection => 
        new Promise<void>((resolve) => {
          try {
            if (connection.isOpen) {
              connection.close(1001, 'Server shutting down');
            }
          } catch (error) {
            console.error(`[WebSocketServer] Error closing connection ${connection.id}:`, error);
          } finally {
            resolve();
          }
        })
      );
      
      // Wait for all connections to close or timeout
      await Promise.race([
        Promise.all(closePromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
      
      // Close the server
      return new Promise<void>((resolve, reject) => {
        wss.close((error?: Error) => {
          if (error) {
            console.error('[WebSocketServer] Error closing server:', error);
            reject(error);
          } else {
            console.log('[WebSocketServer] Server closed successfully');
            // Clean up resources
            connections.complete();
            disconnections.complete();
            errorEvents.complete();
            closeEvents.emit();
            closeEvents.complete();
            resolve();
          }
        });
      });
    },

    /**
     * Event emitted when the server is closed.
     */
    get onClose() {
      return closeEvents;
    },

    /**
     * Event emitted when an error occurs.
     */
    get onError() {
      return errorEvents;
    },

    /**
     * Broadcasts a message to all connected clients.
     * @param message The message to broadcast
     * @returns The number of clients that received the message
     */
    broadcast(message: string | ArrayBuffer | Blob | ArrayBufferView): number {
      if (isClosed) return 0;
      
      const clients = Array.from(activeConnections.values());
          console.error('[WebSocket] Error sending message:', error);
          throw error;
        }
      };

      // Prepare the message once for all clients
      const messageToSend = (() => {
        if (typeof message === 'string' || message instanceof ArrayBuffer || message instanceof Blob) {
          return message;
        } else if (ArrayBuffer.isView(message)) {
          return message.buffer.slice(
            message.byteOffset,
            message.byteOffset + message.byteLength
          );
        }
        console.error(`[WebSocketServer] Unsupported message type: ${typeof message}`);
        return null;
      })();
      
      if (messageToSend === null) return 0;
      
      // Send to all connected clients
      for (const [id, client] of activeConnections.entries()) {
        try {
          if (client.isOpen) {
            sendMessage(messageToSend);
            successCount++;
          } else {
            console.log(`[WebSocketServer] Removing closed client ${id} during broadcast`);
            activeConnections.delete(id);
          }
        } catch (error) {
          console.error(`[WebSocketServer] Error broadcasting to client ${id}:`, error);
          if (!client.isOpen) {
            activeConnections.delete(id);
          }
        }
      }
      
      return successCount;
    },
  };

  // Return the WebSocket server instance
  return webSocketServer;
}

export default createWebSocketServer;
