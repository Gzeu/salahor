/**
 * Type definitions for WebSocket connector
 */

declare module './websocket' {
  import { AbortSignal } from 'node:events';

  /**
   * WebSocket client options
   */
  export interface WebSocketClientOptions {
    /** Delay between reconnection attempts in milliseconds */
    reconnectDelay?: number;
    
    /** Maximum number of reconnection attempts (0 for unlimited) */
    maxReconnectAttempts?: number;
    
    /** Binary type for WebSocket messages */
    binaryType?: 'blob' | 'arraybuffer';
    
    /** AbortSignal to close the connection */
    signal?: AbortSignal;
  }

  /**
   * WebSocket client interface
   */
  export interface WebSocketClient {
    /**
     * Send data through the WebSocket
     * @param data - Data to send (string, ArrayBuffer, or Blob)
     */
    send(data: string | ArrayBuffer | Blob): void;

    /**
     * Async iterable for receiving messages
     */
    messages: AsyncIterable<string | ArrayBuffer | Blob> & {
      /**
       * Subscribe to receive messages via callback
       * @param callback - Function to call on each message
       * @returns Unsubscribe function
       */
      subscribe(callback: (data: string | ArrayBuffer | Blob) => void): () => void;
    };

    /**
     * Close the WebSocket connection
     * @param code - Close code
     * @param reason - Close reason
     */
    close(code?: number, reason?: string): void;

    /**
     * Current connection state
     */
    readonly readyState: 'connected' | 'disconnected';

    /**
     * Reconnect the WebSocket
     * @returns Promise that resolves when reconnected
     */
    reconnect(): Promise<void>;
  }

  /**
   * WebSocket server options
   */
  export interface WebSocketServerOptions {
    /** Port to listen on */
    port?: number;
    
    /** Host to bind to */
    host?: string;
    
    /** AbortSignal to close the server */
    signal?: AbortSignal;
  }

  /**
   * WebSocket server interface
   */
  export interface WebSocketServer {
    /**
     * Broadcast a message to all connected clients
     * @param data - Data to send (string or object)
     */
    broadcast(data: string | object): void;
    
    /**
     * Close the WebSocket server
     * @param callback - Callback when server is closed
     */
    close(callback?: () => void): void;
    
    /**
     * Number of connected clients
     */
    readonly clientCount: number;
    
    /**
     * Server address information
     */
    readonly address: string | { port: number; family: string; address: string; };
  }

  /**
   * Hybrid HTTP/WebSocket server options
   */
  export interface HybridServerOptions extends WebSocketServerOptions {
    /** HTTP request handler */
    onRequest?: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void;
  }

  /**
   * Hybrid HTTP/WebSocket server interface
   */
  export interface HybridServer extends WebSocketServer {
    /** Underlying HTTP server */
    readonly http: import('http').Server;
    
    /** WebSocket server instance */
    readonly ws: import('ws').WebSocketServer;
  }

  /**
   * Creates a WebSocket client
   * @param url - WebSocket server URL
   * @param options - Connection options
   * @returns WebSocket client instance
   */
  export function createWebSocketClient(
    url: string,
    options?: WebSocketClientOptions
  ): WebSocketClient;

  /**
   * Creates a WebSocket server (Node.js only)
   * @param options - Server options
   * @returns WebSocket server instance
   */
  export function createWebSocketServer(
    options?: WebSocketServerOptions
  ): WebSocketServer;

  /**
   * Creates an HTTP server with WebSocket support (Node.js only)
   * @param options - Server options
   * @returns Hybrid server instance
   */
  export function createHybridServer(
    options?: HybridServerOptions
  ): HybridServer;
}
