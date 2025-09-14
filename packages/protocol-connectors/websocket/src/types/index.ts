/**
 * Core types for WebSocket protocol connector
 */

export type BinaryType = 'nodebuffer' | 'arraybuffer' | 'blob';

export interface WebSocketClientOptions {
  /**
   * Whether to automatically attempt to reconnect on error
   * @default true
   */
  autoReconnect?: boolean;
  
  /**
   * Delay between reconnection attempts in milliseconds
   * @default 1000
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts before giving up
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Custom WebSocket implementation (useful for Node.js or custom implementations)
   * @default WebSocket (browser) or require('ws') (Node.js)
   */
  WebSocket?: any;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Subprotocols to use when connecting to the server
   * @default []
   */
  protocols?: string | string[];

  /**
   * Binary type for the WebSocket connection
   * @default 'nodebuffer' (Node.js) or 'blob' (browser)
   */
  binaryType?: BinaryType;

  /**
   * Custom headers to send with the WebSocket handshake
   * @default {}
   */
  headers?: Record<string, string>;

  /**
   * Callback when the connection is established
   */
  onOpen?: (event: Event) => void;

  /**
   * Callback when the connection is closed
   */
  onClose?: (event: CloseEvent) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (event: Event) => void;

  /**
   * Callback when a reconnection attempt is made
   */
  onReconnect?: (attempt: number, maxAttempts: number) => void;

  /**
   * Callback when maximum reconnection attempts are reached
   */
  onMaxReconnectAttempts?: (attempts: number) => void;

  /**
   * Additional options to pass to the WebSocket constructor
   */
  [key: string]: any;
}

export interface WebSocketClient {
  /**
   * The current state of the WebSocket connection
   * @returns The readyState of the WebSocket connection
   */
  readonly readyState: number;

  /**
   * The URL of the WebSocket server
   */
  readonly url: string;

  /**
   * Send data through the WebSocket connection
   * @param data The data to send (string, ArrayBuffer, or ArrayBufferView)
   */
  send(data: string | ArrayBuffer | ArrayBufferView): void;

  /**
   * Close the WebSocket connection
   * @param code Close status code
   * @param reason Reason for closing the connection
   */
  close(code?: number, reason?: string): void;

  /**
   * Manually reconnect to the WebSocket server
   * @returns The new WebSocket instance
   */
  reconnect(): WebSocket;

  /**
   * Subscribe to WebSocket messages
   * @param event The event type to listen for (only 'message' is supported)
   * @param listener Callback function for message events
   * @returns A function to unsubscribe
   */
  on(event: 'message', listener: (data: MessageEvent) => void): () => void;

  /**
   * Async iterator for WebSocket messages
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<MessageEvent>;
}

export interface WebSocketServerOptions {
  /**
   * The port to listen on
   * @default 8080
   */
  port?: number;

  /**
   * The host to bind to
   * @default '0.0.0.0'
   */
  host?: string;

  /**
   * Custom HTTP/HTTPS server to use
   */
  server?: any;

  /**
   * SSL/TLS options (for HTTPS)
   */
  ssl?: {
    key: string | Buffer;
    cert: string | Buffer;
    passphrase?: string;
  };

  /**
   * The path to listen on
   * @default '/'
   */
  path?: string;

  /**
   * Maximum allowed message size in bytes
   * @default 104857600 (100MB)
   */
  maxPayload?: number;

  /**
   * Whether to track clients
   * @default true
   */
  clientTracking?: boolean;

  /**
   * Enable/disable permessage-deflate
   * @default true
   */
  perMessageDeflate?: boolean | object;

  /**
   * Custom protocol handler
   */
  handleProtocols?: (protocols: Set<string>, request: any) => string | false;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export interface WebSocketServer {
  /**
   * Start the WebSocket server
   */
  start(): Promise<void>;

  /**
   * Stop the WebSocket server
   */
  stop(): Promise<void>;

  /**
   * Broadcast a message to all connected clients
   * @param message The message to send
   * @param isBinary Whether the message is binary
   */
  broadcast(message: any, isBinary?: boolean): void;

  /**
   * Subscribe to incoming messages
   * @param callback Callback function for messages
   * @returns A function to unsubscribe
   */
  onMessage(
    callback: (data: { socket: any; message: any; isBinary: boolean }) => void
  ): () => void;

  /**
   * Subscribe to new connections
   * @param callback Callback function for new connections
   * @returns A function to unsubscribe
   */
  onConnection(
    callback: (data: { socket: any; request: any }) => void
  ): () => void;

  /**
   * Subscribe to server close events
   * @param callback Callback function when server closes
   * @returns A function to unsubscribe
   */
  onClose(callback: () => void): () => void;

  /**
   * Subscribe to error events
   * @param callback Callback function for errors
   * @returns A function to unsubscribe
   */
  onError(callback: (error: Error) => void): () => void;

  /**
   * Get all connected clients
   * @returns A Set of connected WebSocket clients
   */
  getClients(): Set<any>;
}

// Re-export commonly used types
export { EventStream };

export * from './server';
export * from './client';
