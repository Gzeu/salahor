import { createEventStream } from '@salahor/core';
import type { WebSocketClient, WebSocketClientOptions } from '../types';

// Common WebSocket interface that works in both browser and Node.js
interface CommonWebSocket extends EventTarget {
  readonly url: string;
  readonly readyState: number;
  binaryType: BinaryType;
  onopen: ((this: WebSocket, ev: Event) => any) | null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
  onerror: ((this: WebSocket, ev: Event) => any) | null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
}

type WebSocketType = {
  new (url: string | URL, protocols?: string | string[]): CommonWebSocket;
  readonly CONNECTING: number;
  readonly OPEN: number;
  readonly CLOSING: number;
  readonly CLOSED: number;
};

type WebSocketInstance = CommonWebSocket;

interface ExtendedWebSocketClientOptions extends WebSocketClientOptions {
  debug?: boolean;
  protocols?: string | string[];
  binaryType?: BinaryType;
  headers?: Record<string, string>;
  retryOnError?: boolean;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onReconnect?: () => void;
  onMaxReconnectAttempts?: () => void;
}

function getDefaultWebSocket(): WebSocketType {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket as unknown as WebSocketType;
  }
  try {
    return require('ws');
  } catch (e) {
    throw new Error('No WebSocket implementation found');
  }
}

export function createWebSocketClient(
  url: string,
  options: ExtendedWebSocketClientOptions = {}
): WebSocketClient {
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    WebSocket: WebSocketImpl = getDefaultWebSocket(),
    debug = false,
    protocols = [],
    binaryType = 'blob',
    retryOnError = true,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
  } = options;

  let ws: WebSocketInstance | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let isExplicitClose = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];
  const messageSubscribers = new Set<(data: MessageEvent) => void>();

  const log = (message: string, ...args: unknown[]): void => {
    if (debug) console.log(`[WebSocket] ${message}`, ...args);
  };

  const cleanup = (): void => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  const processMessageQueue = (): void => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message) ws.send(message);
    }
  };

  const connect = (): WebSocketInstance => {
    cleanup();

    if (isExplicitClose) {
      throw new Error('Connection was explicitly closed');
    }

    try {
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        try { ws.close(); } catch (e) {}
      }

      ws = new WebSocketImpl(url, protocols) as WebSocketInstance;
      ws.binaryType = binaryType;

      ws.onopen = (event: Event) => {
        log('Connected');
        reconnectAttempts = 0;
        processMessageQueue();
        onOpen?.(event);
      };

      ws.onclose = (event: CloseEvent) => {
        log('Connection closed', event.code, event.reason);
        onClose?.(event);

        if (isExplicitClose) return;

        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 30000);
          log(`Reconnecting in ${delay}ms...`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            onReconnect?.();
            connect();
          }, delay);
        } else {
          log('Max reconnection attempts reached');
          onMaxReconnectAttempts?.();
        }
      };

      ws.onerror = (event: Event) => {
        log('Error', event);
        onError?.(event);
      };

      ws.onmessage = (event: MessageEvent) => {
        messageSubscribers.forEach(cb => cb(event));
        onMessage?.(event);
      };

      return ws;
    } catch (error) {
      log('Connection error:', error);
      throw error;
    }
  };

  const client: WebSocketClient = {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    get url() {
      return ws?.url ?? '';
    },
    send(data: string | ArrayBuffer | ArrayBufferView) {
      if (!ws) {
        log('Cannot send: not connected');
        return;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        messageQueue.push(data);
      } else {
        log('Cannot send: connection not open');
      }
    },
    close(code = 1000, reason?: string) {
      isExplicitClose = true;
      if (ws) ws.close(code, reason);
      cleanup();
    },
    reconnect() {
      if (ws) ws.close();
      return connect();
    },
    on(event: 'message', listener: (data: MessageEvent) => void) {
      messageSubscribers.add(listener);
      return () => messageSubscribers.delete(listener);
    },
    [Symbol.asyncIterator]() {
      const stream = createEventStream<MessageEvent>(({ next }) => {
        const unsubscribe = this.on('message', next);
        return () => unsubscribe();
      });
      
      if (typeof stream[Symbol.asyncIterator] !== 'function') {
        throw new Error('EventStream is not async iterable');
      }
      
      return stream[Symbol.asyncIterator]();
    },
  };

  // Initial connection
  connect();
  return client;
}
