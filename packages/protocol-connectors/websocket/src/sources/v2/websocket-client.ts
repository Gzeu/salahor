import { createEventStream, EventStream } from '@salahor/core';
import { BinaryType, WebSocketClient, WebSocketClientOptions } from '../types';

// Extend WebSocket types to include browser and Node.js specific properties
declare global {
  interface WebSocket {
    binaryType: BinaryType;
    onopen: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    send(data: string | ArrayBuffer | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
    readyState: number;
    url: string;
    CONNECTING: number;
    OPEN: number;
    CLOSING: number;
    CLOSED: number;
  }
}

type WebSocketData = string | ArrayBuffer | Blob | ArrayBufferView;

export class ConnectionError extends Error {
  constructor(message: string, public code?: number | string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Get the default WebSocket implementation for the current environment
 */
function getDefaultWebSocket(): typeof WebSocket {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket;
  }
  if (typeof window !== 'undefined' && (window as any).WebSocket) {
    return (window as any).WebSocket;
  }
  if (typeof global !== 'undefined' && (global as any).WebSocket) {
    return (global as any).WebSocket;
  }
  try {
    return require('ws');
  } catch (e) {
    throw new Error(
      'WebSocket is not natively supported in this environment. Please provide a WebSocket implementation.'
    );
  }
}

interface ExtendedWebSocketClientOptions extends WebSocketClientOptions {
  /**
   * Custom WebSocket implementation (useful for testing or custom implementations)
   */
  WebSocket?: typeof WebSocket;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Creates a WebSocket client with reconnection and event handling
 * @param url The WebSocket server URL
 * @param options Configuration options for the WebSocket client
 * @returns A WebSocket client instance
 */
export function createWebSocketClient(
  url: string,
  options: ExtendedWebSocketClientOptions = {}
): WebSocketClient {
  // Default options
  const {
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    debug = false,
    protocols = [],
    binaryType = 'blob',
    headers = {},
    WebSocket: CustomWebSocket,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
    ...wsOptions
  } = options;

  // State
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isExplicitClose = false;
  const messageQueue: WebSocketData[] = [];
  const messageSubscribers: ((data: any) => void)[] = [];
  const eventStream = createEventStream<MessageEvent>();

  // Debug logging
  const log = (...args: any[]) => {
    if (debug) {
      console.log('[WebSocket]', ...args);
    }
  };

  // Cleanup resources
  const cleanup = () => {
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  // Handle reconnection
  const reconnect = () => {
    if (!autoReconnect || isExplicitClose) {
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      log(`Max reconnection attempts (${maxReconnectAttempts}) reached`);
      onMaxReconnectAttempts?.(reconnectAttempts);
      return;
    }

    reconnectAttempts++;
    log(`Reconnecting (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
    onReconnect?.(reconnectAttempts, maxReconnectAttempts);

    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
    reconnectTimeout = setTimeout(connect, delay);
  };

  // Create WebSocket connection
  const connect = () => {
    try {
      // Clean up any existing connection
      cleanup();

      // Get WebSocket implementation
      const WebSocketImpl = CustomWebSocket || getDefaultWebSocket();
      
      // Create WebSocket instance
      ws = Array.isArray(protocols) && protocols.length > 0
        ? new WebSocketImpl(url, protocols, wsOptions)
        : new WebSocketImpl(url, wsOptions);

      // Set binary type
      ws.binaryType = binaryType;

      // Set up event handlers
      ws.onopen = (event) => {
        log('Connected to', url);
        reconnectAttempts = 0;
        
        // Process any queued messages
        while (messageQueue.length > 0 && ws?.readyState === WebSocketImpl.OPEN) {
          const message = messageQueue.shift();
          if (message) {
            ws.send(message);
          }
        }
        
        onOpen?.(event);
      };

      ws.onclose = (event) => {
        log('Disconnected:', event.code, event.reason);
        onClose?.(event);
        
        if (!isExplicitClose) {
          reconnect();
        }
      };

      ws.onerror = (event) => {
        log('Error:', event);
        onError?.(event);
      };

      ws.onmessage = (event) => {
        log('Message received:', event.data);
        onMessage?.(event);
        
        // Notify subscribers
        messageSubscribers.forEach(subscriber => subscriber(event.data));
        
        // Add to event stream
        eventStream.next(event);
      };

    } catch (error) {
      log('Connection error:', error);
      onError?.(new Event('error') as any);
      reconnect();
    }
  };

  // Create client API
  const client: WebSocketClient = {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },

    get url() {
      return url;
    },

    send(data: WebSocketData) {
      if (!ws) {
        throw new ConnectionError('WebSocket is not connected');
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      } else if (autoReconnect && !isExplicitClose) {
        // Queue the message if we're reconnecting
        messageQueue.push(data);
      } else {
        throw new ConnectionError('WebSocket is not connected');
      }
    },

    close(code?: number, reason?: string) {
      isExplicitClose = true;
      if (ws) {
        ws.close(code, reason);
      }
      cleanup();
    },

    on(event: string, listener: (...args: any[]) => void) {
      if (event === 'message') {
        messageSubscribers.push(listener);
        return () => {
          const index = messageSubscribers.indexOf(listener);
          if (index !== -1) {
            messageSubscribers.splice(index, 1);
          }
        };
      }
      
      // For other events, we'd need to implement a more generic event emitter
      // For now, we'll just support message events
      return () => {};
    },

    [Symbol.asyncIterator](): AsyncIterator<MessageEvent> {
      return eventStream[Symbol.asyncIterator]();
    }
  };

  // Start the initial connection
  connect();

  return client;
}
