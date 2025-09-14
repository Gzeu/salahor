import { createEventStream } from '@salahor/core';
import type { WebSocketClient, WebSocketClientOptions, BinaryType } from './types';

type WebSocketData = string | ArrayBuffer | ArrayBufferView | Blob;

export class ConnectionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

interface InternalWebSocketClientOptions extends WebSocketClientOptions {
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

function getDefaultWebSocket(): typeof WebSocket {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket;
  }
  try {
    return require('ws');
  } catch (e) {
    throw new Error('No WebSocket implementation found');
  }
}

export function createWebSocketClient(
  url: string,
  options: InternalWebSocketClientOptions = {}
): WebSocketClient {
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    WebSocket: WebSocketImpl = getDefaultWebSocket(),
    protocols = [],
    binaryType = 'blob',
    debug = false,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
  } = options;

  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isExplicitlyClosed = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];
  const messageSubscribers: Set<(data: MessageEvent) => void> = new Set();

  const log = debug ? console.log : () => {};

  const cleanupSocket = (): void => {
    if (!socket) return;

    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;

    if (socket.readyState === WebSocketImpl.OPEN) {
      socket.close(1000, 'Client closed');
    }
    socket = null;
  };

  const setupSocket = (): void => {
    if (!socket) return;

    socket.binaryType = binaryType;

    socket.onopen = (event: Event) => {
      reconnectAttempts = 0;
      log('WebSocket connection established');
      onOpen?.(event);
      
      // Process any queued messages
      while (messageQueue.length > 0 && socket?.readyState === WebSocketImpl.OPEN) {
        const message = messageQueue.shift();
        if (message) {
          socket.send(message);
        }
      }
    };

    socket.onclose = (event: CloseEvent) => {
      log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      onClose?.(event);
      
      if (!isExplicitlyClosed && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts), 30000);
        log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          onReconnect?.();
          connect().catch(console.error);
        }, delay);
      } else if (reconnectAttempts >= maxReconnectAttempts) {
        onMaxReconnectAttempts?.();
      }
    };

    socket.onerror = (event: Event) => {
      log('WebSocket error:', event);
      onError?.(event);
    };

    socket.onmessage = (event: MessageEvent) => {
      onMessage?.(event);
      messageSubscribers.forEach(cb => cb(event));
    };
  };

  const connect = async (): Promise<void> => {
    if (socket) {
      cleanupSocket();
    }

    try {
      log(`Connecting to WebSocket: ${url}`);
      socket = new WebSocketImpl(url, protocols);
      setupSocket();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof ConnectionError ? error.code : 'ECONNFAILED';
      
      log(`Failed to create WebSocket (${errorCode}): ${errorMessage}`);
      
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts), 30000);
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          connect().catch(console.error);
        }, delay);
      }
      
      throw error;
    }
  };

  // Initial connection
  connect().catch(console.error);

  return {
    get readyState(): number {
      return socket?.readyState ?? WebSocketImpl.CLOSED;
    },

    get url(): string {
      return socket?.url ?? url;
    },

    send(data: string | ArrayBuffer | ArrayBufferView): void {
      if (!socket || socket.readyState !== WebSocketImpl.OPEN) {
        messageQueue.push(data);
        return;
      }
      
      try {
        socket.send(data);
      } catch (error) {
        log('Error sending message:', error);
        throw error;
      }
    },

    close(code = 1000, reason?: string): void {
      isExplicitlyClosed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (socket) {
        socket.close(code, reason);
      }
    },

    reconnect(): void {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      isExplicitlyClosed = false;
      reconnectAttempts = 0;
      connect().catch(console.error);
    },

    on(event: 'message', listener: (data: MessageEvent) => void): () => void {
      messageSubscribers.add(listener);
      return () => {
        messageSubscribers.delete(listener);
      };
    },

    async *[Symbol.asyncIterator](): AsyncIterator<MessageEvent> {
      const messageQueue: MessageEvent[] = [];
      let resolveNext: (() => void) | null = null;
      
      const unsubscribe = this.on('message', (event: MessageEvent) => {
        messageQueue.push(event);
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      });

      try {
        while (true) {
          if (messageQueue.length > 0) {
            const message = messageQueue.shift();
            if (message) {
              yield message;
            }
          } else {
            await new Promise<void>((resolve) => {
              resolveNext = resolve;
            });
          }
        }
      } finally {
        unsubscribe();
      }
    },
  };
}

export default createWebSocketClient;
