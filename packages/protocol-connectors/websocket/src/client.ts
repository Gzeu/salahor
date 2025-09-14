import { createEventStream, EventStream } from '@salahor/core';
import type { WebSocketClient, WebSocketClientOptions } from './types';
import { devLogger, isDev, fileExists } from './utils';

// Re-export types for backward compatibility
export type { WebSocketClient, WebSocketClientOptions };

class ConnectionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

type WebSocketType = {
  new (url: string, protocols?: string | string[], options?: any): WebSocket;
  CONNECTING: number;
  OPEN: number;
  CLOSING: number;
  CLOSED: number;
};

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
  options: WebSocketClientOptions = {}
): WebSocketClient {
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = Infinity,
    WebSocket: WebSocketImpl = getDefaultWebSocket(),
    wsOptions = {},
    protocols = [],
    debug = false,
  } = options;

  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isExplicitlyClosed = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];

  // Create event streams
  const messageStream = createEventStream<MessageEvent>();
  const openEvents = createEventStream<Event>();
  const closeEvents = createEventStream<CloseEvent>();
  const errorEvents = createEventStream<Event>();

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

    socket.onopen = (event: Event) => {
      reconnectAttempts = 0;
      log('WebSocket connection established');
      openEvents.emit(event);
      
      // Process any queued messages
      while (messageQueue.length > 0) {
        const message = messageQueue.shift();
        if (message) {
          socket.send(message);
        }
      }
    };

    socket.onclose = (event: CloseEvent) => {
      log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      closeEvents.emit(event);
      
      if (!isExplicitlyClosed && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts), 30000);
        log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          connect().catch(console.error);
        }, delay);
      }
    };

    socket.onerror = (event: Event) => {
      log('WebSocket error:', event);
      errorEvents.emit(event);
    };

    socket.onmessage = (event: MessageEvent) => {
      messageStream.emit(event);
    };
  };

  const connect = async (): Promise<void> => {
    if (socket) {
      cleanupSocket();
    }

    try {
      if (isDev) {
        await checkRequiredFiles(wsOptions);
      }
      
      log(`Connecting to WebSocket: ${url}`);
      socket = new WebSocketImpl(url, protocols, wsOptions);
      setupSocket();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof ConnectionError ? error.code : 'ECONNFAILED';
      
      const errorMsg = `Failed to create WebSocket (${errorCode}): ${errorMessage}`;
      log(errorMsg, error instanceof Error ? error : undefined);
      
      // Schedule reconnection if needed
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts), 30000);
        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          connect().catch(console.error);
        }, delay);
      }
      
      throw error;
    }
      
      // Emit error event
      errorEvents.emit(new ErrorEvent('error', {
        message: errorMessage,
        error: error instanceof Error ? error : new Error(errorMessage)
      }));
      
      scheduleReconnect();
    }
  };

  const setupSocket = (): void => {
    if (!socket) return;

    socket.onopen = (event) => {
      reconnectAttempts = 0;
      openEvents.emit(event);
    };

    socket.onmessage = (event) => {
      messages.emit(event.data);
    };

    socket.onclose = (event) => {
      closeEvents.emit(event);
      cleanupSocket();
      
      if (!isExplicitlyClosed && (maxReconnectAttempts === Infinity || reconnectAttempts < maxReconnectAttempts)) {
        scheduleReconnect();
      }
    };

    socket.onerror = (event) => {
      errorEvents.emit(event);
    };
  };

  const cleanupSocket = (): void => {
    if (!socket) return;

    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    
    if (socket.readyState === WebSocketImpl.OPEN) {
      socket.close();
    }
    
    socket = null;
  };

  const scheduleReconnect = (): void => {
    if (isExplicitlyClosed) return;
    
    reconnectAttempts++;
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    reconnectTimeout = setTimeout(() => {
      if (!isExplicitlyClosed) {
        connect();
      }
    }, reconnectDelay);
  };

  // Auto-connect
  connect();

  // Public API
  return {
    get socket() {
      return socket as WebSocket;
    },
    
    get messages() {
      return messages;
    },
    
    get isConnected() {
      return socket?.readyState === WebSocketImpl.OPEN;
    },
    
    send(data: string | ArrayBuffer | Blob): void {
      if (this.isConnected && socket) {
        socket.send(data);
      } else {
        console.warn('Cannot send message: WebSocket is not connected');
      }
    },
    
    close(code?: number, reason?: string): void {
      isExplicitlyClosed = true;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      if (socket) {
        socket.close(code, reason);
      }
    },
    
    reconnect: (): void => {
      if (!isExplicitlyClosed) {
        reconnectAttempts = 0;
        connect().catch(error => {
          console.error('Error during reconnection:', error);
        });
      }
    },
    
    get onOpen() {
      return openEvents;
    },
    
    get onClose() {
      return closeEvents;
    },
    
    get onError() {
      return errorEvents;
    },
  };
}

function getDefaultWebSocket(): typeof WebSocket {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket;
  }
  
  try {
    // For Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('ws');
  } catch (error) {
    throw new Error(
      'WebSocket is not available in this environment. ' +
      'Please provide a WebSocket implementation via the options.'
    );
  }
}
