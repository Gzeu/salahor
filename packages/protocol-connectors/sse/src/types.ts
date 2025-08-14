import { EventStream } from '../../../core/dist/event-stream.js';

// Node.js compatible request/response interfaces
export interface NodeRequest {
  on(event: 'close', listener: () => void): void;
  [key: string]: any;
}

export interface NodeResponse {
  write(chunk: string): void;
  end(): void;
  flushHeaders(): void;
  writeHead(status: number, headers: Record<string, string | string[] | undefined>): void;
  [key: string]: any;
}

// Custom EventSource-like interface for cross-environment compatibility
export interface SseEventSource {
  onopen: ((this: SseEventSource, ev: Event) => any) | null;
  onmessage: ((this: SseEventSource, ev: MessageEvent) => any) | null;
  onerror: ((this: SseEventSource, ev: Event) => any) | null;
  close(): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
  readonly readyState: number;
  readonly url: string;
  readonly withCredentials: boolean;
}

/**
 * SSE client options
 */
export interface SseClientOptions {
  /**
   * Headers to include in the SSE request
   */
  headers?: Record<string, string>;
  
  /**
   * HTTP method to use for the request
   * @default 'GET'
   */
  method?: string;
  
  /**
   * Request body (for POST requests)
   */
  body?: BodyInit;

  /**
   * Whether to include credentials (cookies, HTTP authentication)
   * in cross-origin requests
   * @default false
   */
  withCredentials?: boolean;
  
  /**
   * Whether to automatically reconnect on connection loss
   * @default true
   */
  autoReconnect?: boolean;
  
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
}

/**
 * SSE event data
 */
export interface SseEvent {
  /**
   * The event type (specified in the event: field)
   */
  type: string;
  
  /**
   * The event data
   */
  data: string;
  
  /**
   * The event ID (specified in the id: field)
   */
  id?: string;
  
  /**
   * The reconnection time in milliseconds (specified in the retry: field)
   */
  retry?: number;
}

/**
 * SSE client interface
 */
export interface SseClient {
  /**
   * The EventSource instance (or polyfill)
   */
  readonly source: EventSource | any;
  
  /**
   * Stream of incoming events
   */
  readonly events: EventStream<SseEvent>;
  
  /**
   * Whether the client is currently connected
   */
  readonly isConnected: boolean;
  
  /**
   * Close the connection
   */
  close(): void;
  
  /**
   * Reconnect to the server
   */
  reconnect(): void;
}

/**
 * SSE server options
 */
export interface SseServerOptions {
  /**
   * Headers to include in responses
   */
  headers?: Record<string, string>;
  
  /**
   * Whether to send a comment every interval to keep the connection alive
   * @default true
   */
  keepAlive?: boolean;
  
  /**
   * Interval for keep-alive comments in milliseconds
   * @default 30000 (30 seconds)
   */
  keepAliveInterval?: number;
  
  /**
   * Maximum number of connections to allow
   * @default Infinity
   */
  maxConnections?: number;
}

/**
 * SSE connection interface
 */
export interface SseConnection {
  /**
   * The underlying request object
   */
  readonly request: NodeRequest;
  
  /**
   * The response object used to send events
   */
  readonly response: NodeResponse;
  
  /**
   * The connection ID
   */
  readonly id: string;
  
  /**
   * Whether the connection is currently active
   */
  readonly isConnected: boolean;
  
  /**
   * Send an event to the client
   * @param event The event to send
   */
  send(event: Omit<SseEvent, 'retry'>): void;
  
  /**
   * Close the connection
   */
  close(): void;
}

/**
 * SSE server interface
 */
export interface SseServer {
  /**
   * Handle an HTTP request as an SSE connection
   * @param req The HTTP request
   * @param res The HTTP response
   */
  handleRequest(req: NodeRequest, res: NodeResponse): void;
  
  /**
   * The underlying HTTP server (if any)
   */
  readonly server: any;
  
  /**
   * Stream of new connections
   */
  readonly connections: EventStream<SseConnection>;
  
  /**
   * Close the server and all connections
   */
  close(): Promise<void>;
  
  /**
   * Broadcast an event to all connected clients
   * @param event The event to broadcast
   */
  broadcast(event: Omit<SseEvent, 'retry'>): void;
}
