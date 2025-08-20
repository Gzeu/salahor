import { EventStream } from '@salahor/core';

/**
 * WebSocket client options
 */
export interface WebSocketClientOptions {
  /**
   * Delay between reconnection attempts in milliseconds
   * @default 1000
   */
  reconnectDelay?: number;
  
  /**
   * Maximum number of reconnection attempts
   * @default Infinity
   */
  maxReconnectAttempts?: number;
  
  /**
   * Custom WebSocket implementation
   * @default WebSocket (browser) or require('ws') (Node.js)
   */
  WebSocket?: any;
  
  /**
   * Additional WebSocket options
   */
  wsOptions?: Record<string, any>;
}

/**
 * WebSocket client interface
 */
export interface WebSocketClient {
  /**
   * The underlying WebSocket instance
   */
  readonly socket: WebSocket;
  
  /**
   * Stream of incoming messages
   */
  readonly messages: EventStream<string | ArrayBuffer | Blob>;
  
  /**
   * Whether the client is currently connected
   */
  readonly isConnected: boolean;
  
  /**
   * Send a message to the server
   * @param data The data to send
   */
  send(data: string | ArrayBuffer | Blob): void;
  
  /**
   * Close the connection
   * @param code Close code
   * @param reason Close reason
   */
  close(code?: number, reason?: string): void;
  
  /**
   * Reconnect to the server
   */
  reconnect(): void;
  
  /**
   * Event emitted when the connection is opened
   */
  onOpen: EventStream<Event>;
  
  /**
   * Event emitted when the connection is closed
   */
  onClose: EventStream<CloseEvent>;
  
  /**
   * Event emitted when an error occurs
   */
  onError: EventStream<Event>;
}

/**
 * WebSocket server options
 */
export interface WebSocketServerOptions {
  /**
   * Port to listen on (ignored if server is provided)
   * @default 8080
   */
  port?: number;
  
  /**
   * Host to bind to (ignored if server is provided)
   * @default '0.0.0.0'
   */
  host?: string;
  
  /**
   * Existing HTTP/S server to use
   */
  server?: any;
  
  /**
   * Custom WebSocket server implementation
   * @default require('ws').Server
   */
  WebSocketServer?: any;
  
  /**
   * Whether to echo messages back to the sender (true) or broadcast to others (false)
   * @default true
   */
  echo?: boolean;
  
  /**
   * Additional WebSocket server options
   */
  wsOptions?: Record<string, any>;
}

/**
 * WebSocket connection interface
 */
export interface WebSocketConnection {
  /**
   * The underlying WebSocket instance
   */
  readonly socket: WebSocket;
  
  /**
   * A unique identifier for the connection
   */
  readonly id: string;
  
  /**
   * The remote address
   */
  readonly remoteAddress: string;
  
  /**
   * Stream of incoming messages
   */
  readonly messages: EventStream<string | ArrayBuffer | Blob>;
  
  /**
   * Whether the connection is currently open
   */
  readonly isOpen: boolean;
  
  /**
   * The current state of the connection
   * 0 - CONNECTING
   * 1 - OPEN
   * 2 - CLOSING
   * 3 - CLOSED
   */
  readonly readyState: number;
  
  /**
   * Send a message to the client
   * @param data The data to send
   */
  send(data: string | ArrayBuffer | Blob): void;
  
  /**
   * Close the connection
   * @param code Close code
   * @param reason Close reason
   */
  close(code?: number, reason?: string): void;
  
  /**
   * Promise that resolves when the connection is closed
   */
  readonly onClose: Promise<CloseEvent>;
  
  /**
   * Event emitted when an error occurs
   */
  onError: EventStream<Event>;
}

/**
 * WebSocket server interface
 */
export interface WebSocketServer {
  /**
   * The underlying HTTP/HTTPS server instance
   */
  readonly server: any; // ws.Server type from 'ws' package
  
  /**
   * Event streams
   */
  readonly connections: EventStream<WebSocketConnection>;
  readonly onClose: EventStream<void>;
  readonly onError: EventStream<Error>;
  
  /**
   * Connection management
   */
  readonly activeConnections: Map<string, WebSocketConnection>;
  getConnection(id: string): WebSocketConnection | undefined;
  
  /**
   * Server control
   */
  start(port?: number): Promise<void>;
  close(code?: number, reason?: string): Promise<void>;
  
  /**
   * Close the server and all connections
   */
  close(): Promise<void>;
}
