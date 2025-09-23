/**
 * Advanced WebSocket connector with automatic reconnection and state management
 * Provides reliable WebSocket connections with intelligent retry strategies
 */

import { EventStream } from '@salahor/core';
import { EventStreamImpl } from '@salahor/core';

export enum WebSocketState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface ConnectionEvent {
  state: WebSocketState;
  timestamp: number;
  error?: Error;
  reconnectAttempt?: number;
}

export interface WebSocketConfig {
  /**
   * WebSocket URL to connect to
   */
  url: string;

  /**
   * WebSocket protocols
   */
  protocols?: string | string[];

  /**
   * Enable automatic reconnection
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Initial reconnection delay in milliseconds
   * @default 1000
   */
  reconnectDelayMs?: number;

  /**
   * Maximum reconnection delay in milliseconds
   * @default 30000
   */
  maxReconnectDelayMs?: number;

  /**
   * Backoff multiplier for reconnection delay
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Heartbeat interval in milliseconds
   * @default 30000
   */
  heartbeatIntervalMs?: number;

  /**
   * Message to send as heartbeat
   * @default {type: 'ping', timestamp: Date.now()}
   */
  heartbeatMessage?: any;

  /**
   * Maximum number of messages to queue during disconnection
   * @default 100
   */
  maxQueueSize?: number;
}

/**
 * Advanced WebSocket connector with automatic reconnection
 */
export class AdvancedWebSocketConnector {
  private readonly config: Required<WebSocketConfig>;
  private ws?: WebSocket;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private messageQueue: any[] = [];
  
  // Event streams
  private readonly messageStream = new EventStreamImpl<WebSocketMessage>();
  private readonly connectionStream = new EventStreamImpl<ConnectionEvent>();
  private readonly errorStream = new EventStreamImpl<Error>();

  constructor(config: WebSocketConfig) {
    this.config = {
      ...config,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelayMs: config.reconnectDelayMs ?? 1000,
      maxReconnectDelayMs: config.maxReconnectDelayMs ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
      heartbeatMessage: config.heartbeatMessage ?? {
        type: 'ping',
        timestamp: Date.now()
      },
      maxQueueSize: config.maxQueueSize ?? 100
    };
  }

  /**
   * Get the message stream
   */
  get messages(): EventStream<WebSocketMessage> {
    return this.messageStream;
  }

  /**
   * Get the connection state stream
   */
  get connections(): EventStream<ConnectionEvent> {
    return this.connectionStream;
  }

  /**
   * Get the error stream
   */
  get errors(): EventStream<Error> {
    return this.errorStream;
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === WebSocketState.CONNECTED) {
        resolve();
        return;
      }

      this.setState(WebSocketState.CONNECTING);
      
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        this.setupWebSocketHandlers(resolve, reject);
      } catch (error) {
        this.setState(WebSocketState.FAILED);
        reject(error as Error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.setState(WebSocketState.DISCONNECTED);
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    
    this.messageQueue = [];
  }

  /**
   * Send a message through the WebSocket
   * @param message Message to send
   */
  send(message: any): boolean {
    if (this.state === WebSocketState.CONNECTED && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.errorStream.emit(error as Error);
        return false;
      }
    }

    // Queue message if disconnected and auto-reconnect is enabled
    if (this.config.autoReconnect && this.messageQueue.length < this.config.maxQueueSize) {
      this.messageQueue.push(message);
    }
    
    return false;
  }

  private setupWebSocketHandlers(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setState(WebSocketState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      resolve();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageStream.emit({
          type: data.type || 'message',
          data,
          timestamp: Date.now()
        });
      } catch (error) {
        this.errorStream.emit(error as Error);
      }
    };

    this.ws.onerror = (event) => {
      const error = new Error(`WebSocket error: ${event}`);
      this.errorStream.emit(error);
      
      if (this.state === WebSocketState.CONNECTING) {
        reject(error);
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      
      if (this.config.autoReconnect && this.state !== WebSocketState.DISCONNECTED) {
        this.scheduleReconnect();
      } else {
        this.setState(WebSocketState.DISCONNECTED);
      }
    };
  }

  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.connectionStream.emit({
        state: newState,
        timestamp: Date.now(),
        reconnectAttempt: this.reconnectAttempts
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setState(WebSocketState.FAILED);
      return;
    }

    this.setState(WebSocketState.RECONNECTING);
    
    const delay = Math.min(
      this.config.reconnectDelayMs * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts),
      this.config.maxReconnectDelayMs
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        // Reconnection failed, will be handled by onclose
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state === WebSocketState.CONNECTED) {
        this.send(this.config.heartbeatMessage);
      }
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private flushMessageQueue(): void {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      this.send(message);
    });
  }
}

/**
 * Create an advanced WebSocket connector
 * @param config WebSocket configuration
 * @returns AdvancedWebSocketConnector instance
 */
export function createAdvancedWebSocket(config: WebSocketConfig): AdvancedWebSocketConnector {
  return new AdvancedWebSocketConnector(config);
}
