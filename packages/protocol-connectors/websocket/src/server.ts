import { createEventStream, EventStream } from '@salahor/core';
import { Server as WSServer, ServerOptions as WSServerOptions, WebSocket as WS, WebSocket as WS_Type } from 'ws';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { AddressInfo } from 'net';
import type { WebSocketServer as IWebSocketServer, WebSocketServerOptions, WebSocketConnection } from './types';

// Extend the global WebSocket interface to include Node.js specific methods
declare global {
  interface WebSocket extends WS_Type {
    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'message', listener: (data: string | Buffer | ArrayBuffer | Buffer[]) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    off?(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    off?(event: 'message', listener: (data: string | Buffer | ArrayBuffer | Buffer[]) => void): this;
    off?(event: 'error', listener: (error: Error) => void): this;
  }
}

// Type definitions for WebSocket events
interface CustomEvent {
  type: string;
  target?: EventTarget | null;
  currentTarget?: EventTarget | null;
  srcElement?: EventTarget | null;
  eventPhase: number;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  timeStamp: number;
  returnValue: any;
  cancelBubble: boolean;
  composed: boolean;
  isTrusted: boolean;
  NONE: number;
  CAPTURING_PHASE: number;
  AT_TARGET: number;
  BUBBLING_PHASE: number;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void;
  composedPath(): EventTarget[];
}

interface CloseEvent extends CustomEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

class ErrorEvent extends Error {
  constructor(type: string, eventInitDict?: { message?: string; error?: Error }) {
    super(eventInitDict?.message || eventInitDict?.error?.message);
    this.name = type;
  }
  
  // Add missing properties to match DOM Event interface
  type: string = '';
  target: EventTarget | null = null;
  currentTarget: EventTarget | null = null;
  eventPhase: number = 0;
  bubbles: boolean = false;
  cancelable: boolean = false;
  defaultPrevented: boolean = false;
  timeStamp: number = 0;
  returnValue: any = undefined;
  cancelBubble: boolean = false;
  composed: boolean = false;
  isTrusted: boolean = false;
  srcElement: EventTarget | null = null;
  
  // Event phase constants
  static NONE = 0;
  static CAPTURING_PHASE = 1;
  static AT_TARGET = 2;
  static BUBBLING_PHASE = 3;
  
  // Event interface methods
  preventDefault(): void {}
  stopPropagation(): void {}
  stopImmediatePropagation(): void {}
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void {}
}

const isDev = process.env.NODE_ENV === 'development';

// Simple logger for development
const devLogger = {
  log: (...args: any[]) => isDev && console.log('[WebSocket]', ...args),
  error: (...args: any[]) => isDev && console.error('[WebSocket]', ...args)
};

// Helper function to create a promise that resolves when the WebSocket closes
function createClosePromise(ws: WebSocket): Promise<CloseEvent> {
  return new Promise<CloseEvent>((resolve) => {
    const onClose = (code: number, reason: Buffer) => {
      if (ws.off) {
        ws.off('close', onClose);
      }
      
      // Create a CloseEvent with all required properties
      const closeEvent: CloseEvent = {
        type: 'close',
        code: code,
        reason: reason?.toString() || '',
        wasClean: true,
        // Add all required Event properties
        target: ws,
        currentTarget: ws,
        srcElement: ws,
        eventPhase: 0,
        bubbles: false,
        cancelable: false,
        defaultPrevented: false,
        timeStamp: Date.now(),
        returnValue: undefined,
        cancelBubble: false,
        composed: false,
        isTrusted: true,
        // Event phase constants
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3,
        // Event methods
        preventDefault: () => {},
        stopPropagation: () => {},
        stopImmediatePropagation: () => {},
        initEvent: () => {},
        composedPath: () => []
      };
      
      resolve(closeEvent);
    };
    
    ws.on('close', onClose);
  });
}

/**
 * Request object passed to WebSocket server connection handler
 */
interface WebSocketRequest {
  socket?: {
    remoteAddress?: string;
  };
  headers?: {
    [key: string]: string | string[] | undefined;
  };
  url?: string;
}

/**
 * Creates a WebSocket connection wrapper
 */
function createWebSocketConnection(ws: WebSocket, request: WebSocketRequest = {}): WebSocketConnection {
  // Generate a unique ID for this connection
  const id = Math.random().toString(36).substring(2, 15);
  const remoteAddress = (request.socket?.remoteAddress as string) || 'unknown';
  const messages = createEventStream<string | ArrayBuffer | Blob>();
  const errorEvents = createEventStream<Error>();
  let isOpen = true;
  
  // Create a promise that resolves when the connection closes
  const closePromise = createClosePromise(ws);
  
  // Forward WebSocket events to our event streams
  const onMessage = (data: string | Buffer | ArrayBuffer | Buffer[]) => {
    try {
      // Convert Buffer to ArrayBuffer if needed
      let message: string | ArrayBuffer | Blob;
      if (Buffer.isBuffer(data)) {
        message = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else if (Array.isArray(data)) {
        // Convert array of buffers to a single ArrayBuffer
        const totalLength = data.reduce((acc, buf) => acc + buf.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of data) {
          result.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
          offset += buf.length;
        }
        message = result.buffer;
      } else {
        message = data;
      }
      
      // Use next() instead of emit() on the EventStream
      (messages as any).next(message);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      (errorEvents as any).error(err);
    }
  };
  
  const onError = (error: Error) => {
    (errorEvents as any).error(error);
  };
  
  const onClose = () => {
    isOpen = false;
    messages.complete();
    errorEvents.complete();
    
    // Clean up event listeners
    if (ws.off) {
      ws.off('message', onMessage);
      ws.off('error', onError);
      ws.off('close', onClose);
    }
  };
  
  // Set up event listeners
  ws.on('message', onMessage);
  ws.on('error', onError);
  ws.on('close', onClose);
  
  return {
    socket: ws,
    id,
    remoteAddress,
    messages,
    get isOpen() { return isOpen; },
    get readyState() { return ws.readyState; },
    get onClose() { return closePromise; },
    onError: errorEvents,
    
    send(data: string | ArrayBuffer | Blob): void {
      if (!isOpen) return;
      
      try {
        ws.send(data as any);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errorEvents.emit(err);
      }
    },
    
    close(code?: number, reason?: string): void {
      if (!isOpen) return;
      isOpen = false;
      ws.close(code, reason);
    }
  };
}

/**
 * Creates a new WebSocket server instance
 * @param options Configuration options for the WebSocket server
 * @returns A new WebSocket server instance
 */
export function createWebSocketServer(options: WebSocketServerOptions = {}): IWebSocketServer {
  let wsServer: WSServer | null = null;
  const connections = new Map<string, WebSocketConnection>();
  const connectionEvents = createEventStream<WebSocketConnection>();
  const closeEvents = createEventStream<{ connection: WebSocketConnection; code: number; reason: string }>();
  const errorEvents = createEventStream<Error>();
  const errorEventsAsAny = errorEvents as any;
  let isServerClosed = true;

  // Helper functions
  const addConnection = (conn: WebSocketConnection) => {
    connections.set(conn.id, conn);
    connectionEvents.emit(conn);
    
    // Set up cleanup on connection close
    conn.onClose.then(() => {
      connections.delete(conn.id);
    });
  };

  const removeConnection = (connId: string) => {
    connections.delete(connId);
  };

  const closeAllConnections = async (code?: number, reason?: string) => {
    await Promise.all(
      Array.from(connections.values()).map(conn => 
        new Promise<void>(resolve => {
          conn.close(code, reason);
          conn.onClose.then(() => resolve());
        })
      )
    );
  };

  // Create the WebSocket server
  if (httpServer) {
    // Attach to existing HTTP server
    wsServer = new WSServerImpl({
      server: httpServer,
      ...wsOptions
    });
  } else {
    // Create a new HTTP server
    wsServer = new WSServerImpl({
      port,
      host,
      ...wsOptions
    });
  }

  // Set up WebSocket server event handlers
  wsServer.on('connection', (ws: WebSocket, request: WebSocketRequest) => {
    try {
      const connection = createWebSocketConnection(ws, request);
      addConnection(connection);
      
      // Handle connection close
      connection.onClose.then(({ code, reason }) => {
        removeConnection(connection.id);
        closeEvents.emit({ connection, code, reason });
      }).catch(error => {
        errorEventsAsAny.next(error);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errorEventsAsAny.next(err);
    }
  });

  wsServer.on('error', (error: Error) => {
    errorEventsAsAny.next(error);
  });

  wsServer.on('close', () => {
    isServerClosed = true;
    closeEvents.emit(undefined);
  });

  isServerClosed = false;

  // Return the WebSocket server interface
  return {
    get server() { return wsServer; },
    get connections() { return connectionEvents; },
    get onClose() { return closeEvents; },
    get onError() { return errorEvents; },
    
    get activeConnections() {
      return new Map(connections);
    },
    
    getConnection(id: string) {
      return connections.get(id);
    },
    
    broadcast(data: string | ArrayBuffer | Blob, excludeId?: string) {
      connections.forEach((conn, id) => {
        if (!excludeId || id !== excludeId) {
          try {
            conn.send(data);
          } catch (error) {
            devLogger.error(`Error broadcasting to connection ${id}:`, error);
          }
        }
      });
    },
    
    async start(serverPort: number = port): Promise<void> {
      if (!isServerClosed) {
        return;
      }
      
      if (httpServer) {
        // Already started by the HTTP server
        return;
      }
      
      return new Promise<void>((resolve, reject) => {
        if (!wsServer) {
          reject(new Error('WebSocket server not initialized'));
          return;
        }
        
        wsServer.once('listening', () => {
          devLogger.log(`WebSocket server started on port ${serverPort}`);
          resolve();
        });
        
        wsServer.once('error', (error: Error) => {
          reject(error);
        });
      });
    },
    
    async stop(): Promise<void> {
      if (!wsServer || isServerClosed) {
        return;
      }
      
      await closeAllConnections(1000, 'Server shutting down');
      
      return new Promise<void>((resolve) => {
        if (!wsServer) {
          resolve();
          return;
        }
        
        wsServer.close(() => {
          wsServer = null;
          isServerClosed = true;
          resolve();
        });
      });
    }
  };
}

