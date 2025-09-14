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
export function getDefaultWebSocket(): typeof WebSocket {
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
  const {
    debug = false,
    protocols = [],
    binaryType = 'nodebuffer',
    headers = {},
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    autoReconnect = true,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
    WebSocket: WebSocketImpl = getDefaultWebSocket(),
  } = options;

  let ws: CommonWebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isExplicitClose = false;
  const messageSubscribers = new Set<(data: MessageEvent) => void>();
  const stream = createEventStream<MessageEvent>(({ next, error, complete }) => {
    const unsubscribe = (data: MessageEvent) => next(data);
    messageSubscribers.add(unsubscribe);
    return () => messageSubscribers.delete(unsubscribe);
  });

  const log = (...args: any[]) => {
    if (debug) {
      console.log('[WebSocket]', ...args);
    }
  };

  const cleanup = () => {
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      
      if (ws.readyState === WebSocketImpl.OPEN) {
        ws.close();
      }
      
      ws = null;
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  const connect = (): CommonWebSocket => {
    cleanup();
    isExplicitClose = false;
    
    log(`Connecting to ${url}...`);
    
    try {
      const wsInstance = new WebSocketImpl(url, protocols);
      wsInstance.binaryType = binaryType;
      
      wsInstance.onopen = (event: Event) => {
        log('WebSocket connected');
        reconnectAttempts = 0;
        onOpen?.(event);
      };
      
      wsInstance.onclose = (event: CloseEvent) => {
        log(`WebSocket closed: ${event.code} ${event.reason}`);
        onClose?.(event);
        
        if (!isExplicitClose && autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          log(`Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          onReconnect?.();
          
          reconnectTimeout = setTimeout(() => {
            connect();
          }, reconnectDelay * Math.pow(2, reconnectAttempts - 1));
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          log('Max reconnection attempts reached');
          onMaxReconnectAttempts?.();
        }
      };
      
      wsInstance.onerror = (event: Event) => {
        log('WebSocket error:', event);
        onError?.(event);
      };
      
      wsInstance.onmessage = (event: MessageEvent) => {
        onMessage?.(event);
        messageSubscribers.forEach(subscriber => subscriber(event));
      };
      
      ws = wsInstance;
      return wsInstance;
    } catch (error) {
      log('WebSocket connection error:', error);
      throw new ConnectionError('CONNECTION_ERROR', `Failed to connect to ${url}: ${error}`);
    }
  };

  // Create the WebSocket client instance
  const client: WebSocketClient = {
    get readyState() {
      return ws?.readyState ?? WebSocketImpl.CLOSED;
    },
    
    get url() {
      return url;
    },
    
    send(data: string | ArrayBuffer | ArrayBufferView) {
      if (!ws || ws.readyState !== WebSocketImpl.OPEN) {
        throw new ConnectionError('NOT_CONNECTED', 'WebSocket is not connected');
      }
      
      try {
        ws.send(data);
      } catch (error) {
        throw new ConnectionError('SEND_ERROR', `Failed to send message: ${error}`);
      }
    },
    
    close(code = 1000, reason?: string) {
      isExplicitClose = true;
      cleanup();
    },
    
    reconnect() {
      reconnectAttempts = 0;
      return connect();
    },
    
    on(event: 'message', listener: (data: MessageEvent) => void) {
      const unsubscribe = (data: MessageEvent) => listener(data);
      messageSubscribers.add(unsubscribe);
      return () => messageSubscribers.delete(unsubscribe);
    },
    
    [Symbol.asyncIterator](): AsyncIterator<MessageEvent> {
      return {
        next: () => {
          return new Promise((resolve) => {
            const unsubscribe = client.on('message', (message) => {
              unsubscribe();
              resolve({ value: message, done: false });
            });
          });
        },
        return: () => {
          return Promise.resolve({ value: undefined, done: true });
        },
        throw: (error) => {
          return Promise.reject(error);
        },
      };
    },
  };

  // Start the initial connection
  connect();
  
  return client;
}

// Extend the global WebSocket type for browser and Node.js compatibility
declare global {
  interface WebSocket {
    binaryType: BinaryType;
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
  }
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
  // Destructure options with defaults
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

  // Validate reconnect settings
  if (reconnectDelay < 0) {
    throw new Error('reconnectDelay must be a non-negative number');
  }
  if (maxReconnectAttempts < 0) {
    throw new Error('maxReconnectAttempts must be a non-negative number');
  }

  // Internal state
  let ws: CommonWebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let isExplicitClose = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];
  const messageSubscribers = new Set<(data: MessageEvent) => void>();

  // Connection state helpers
  const isConnecting = (): boolean => ws?.readyState === WebSocketImpl.CONNECTING;
  const isOpen = (): boolean => ws?.readyState === WebSocketImpl.OPEN;
  const isClosing = (): boolean => ws?.readyState === WebSocketImpl.CLOSING;
  const isClosed = (): boolean => !ws || ws.readyState === WebSocketImpl.CLOSED;

  // Logging utility
  const log = (message: string, ...args: unknown[]): void => {
    if (debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [WebSocket] ${message}`, ...args);
    }
  };

  // Error handling utility
  const handleError = (context: string, error: unknown, recoverable = true): void => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error in ${context}:`, error);

    if (recoverable && retryOnError && !isExplicitClose) {
      scheduleReconnect();
    }

    try {
      onError?.(new Error(`[${context}] ${errorMessage}`));
    } catch (err) {
      log('Error in error handler:', err);
    }
  };

  // Cleanup resources
  const cleanup = (): void => {
    log('Cleaning up resources');

    // Clear any pending reconnect
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Clear message queue if needed
    if (isExplicitClose) {
      messageQueue.length = 0;
    }
  };

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = (): void => {
    if (isExplicitClose || reconnectAttempts >= maxReconnectAttempts) {
      if (reconnectAttempts >= maxReconnectAttempts) {
        log('Max reconnection attempts reached');
        try {
          onMaxReconnectAttempts?.();
        } catch (err) {
          log('Error in onMaxReconnectAttempts handler:', err);
        }
      }
      return;
    }

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttempts),
      30000 // Max 30 seconds
    );
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    const delay = Math.floor(baseDelay + jitter);

    reconnectAttempts++;
    log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

    reconnectTimeout = setTimeout(() => {
      try {
        onReconnect?.();
      } catch (err) {
        log('Error in onReconnect handler:', err);
      }
      connect();
    }, delay);
  };

  const processMessageQueue = (): void => {
    const currentWs = ws;
    if (!currentWs || !isOpen()) return;

    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message) {
        try {
          currentWs.send(message);
        } catch (err) {
          log('Error sending queued message:', err);
          messageQueue.unshift(message); // Requeue the message if sending fails
          handleError('processMessageQueue', err, true);
          break;
        }
      }
    }
  };

  const connect = (): CommonWebSocket => {
    cleanup();

    if (isExplicitClose) {
      throw new ConnectionError('CONNECTION_CLOSED', 'Connection was explicitly closed');
    }

    log('Connecting to', url);

    // Clean up existing connection if it exists
    const oldWs = ws;
    if (oldWs) {
      ws = null;

      // Safely clear event handlers
      try { oldWs.onopen = null; } catch (e) {}
      try { oldWs.onclose = null; } catch (e) {}
      try { oldWs.onerror = null; } catch (e) {}
      try { oldWs.onmessage = null; } catch (e) {}

      // Close the connection
      try {
        if (oldWs.readyState === oldWs.OPEN || oldWs.readyState === oldWs.CONNECTING) {
          oldWs.close(1000, 'Reconnecting');
        }
      } catch (e) {
        log('Error closing previous connection:', e);
      }
    }

    // Create new WebSocket connection
    const newWs = new WebSocketImpl(url, protocols);
    newWs.binaryType = binaryType as BinaryType;
    ws = newWs;

      ws.onopen = (event: Event) => {
        log('Connected to', url);
        reconnectAttempts = 0;
        try {
          processMessageQueue();
          onOpen?.(event);
        } catch (err) {
          log('Error in onOpen handler:', err);
          onError?.(new Event('error'));
        }
      };

      ws.onclose = (event: CloseEvent) => {
        log('Connection closed', { code: event.code, reason: event.reason });
        
        try {
          onClose?.(event);
        } catch (err) {
          log('Error in onClose handler:', err);
        }

        if (isExplicitClose) return;

        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(
            reconnectDelay * Math.pow(2, reconnectAttempts),
            30000 // Max 30 seconds
          );
          
          log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            try {
              onReconnect?.();
            } catch (err) {
              log('Error in onReconnect handler:', err);
            }
            connect();
          }, delay);
        } else {
          log('Max reconnection attempts reached');
          try {
            onMaxReconnectAttempts?.();
          } catch (err) {
            log('Error in onMaxReconnectAttempts handler:', err);
          }
        }
      };

      ws.onerror = (event: Event) => {
        log('WebSocket error:', event);
        try {
          onError?.(event);
        } catch (err) {
          log('Error in onError handler:', err);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          messageSubscribers.forEach(cb => {
            try {
              cb(event);
            } catch (err) {
              log('Error in message subscriber:', err);
            }
          });
          onMessage?.(event);
        } catch (err) {
          log('Error processing message:', err);
        }
      };

      return ws;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('Connection error:', errorMessage);
      
      if (ws) {
        try { ws.close(); } catch (e) {}
        ws = null;
      }
      
      throw new ConnectionError('CONNECTION_FAILED', `Failed to connect: ${errorMessage}`);
    }
  };

  // Create the WebSocket client
  const client: WebSocketClient = {
    get readyState(): number {
      return ws?.readyState ?? WebSocketImpl.CLOSED;
    },
    
    get url(): string {
      return ws?.url ?? url;
    },
    
    send(data: string | ArrayBuffer | ArrayBufferView): void {
      if (!ws) {
        throw new ConnectionError('NOT_CONNECTED', 'WebSocket is not connected');
      }

      if (ws.readyState === WebSocketImpl.OPEN) {
        try {
          ws.send(data);
        } catch (err) {
          throw new ConnectionError('SEND_ERROR', `Failed to send message: ${err}`);
        }
      } else if (ws.readyState === WebSocketImpl.CONNECTING) {
        messageQueue.push(data);
      } else {
        throw new ConnectionError('NOT_CONNECTED', 'WebSocket is not connected');
      }
    },
    
    close(code = 1000, reason?: string): void {
      isExplicitClose = true;
      if (ws) {
        try {
          ws.close(code, reason);
        } catch (err) {
          log('Error closing WebSocket:', err);
        }
      }
      cleanup();
    },
    
    reconnect(): void {
      if (ws) {
        try {
          ws.close();
        } catch (err) {
          log('Error closing WebSocket during reconnect:', err);
        }
      }
      connect();
    },
    
    on(event: 'message', listener: (data: MessageEvent) => (() => void)): (() => void) {
      if (event !== 'message') {
        throw new Error('Only "message" event is supported');
      }
      
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
          const message = messageQueue.shift()!;
          yield message;
        } else {
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      }
    } finally {
      unsubscribe();
    }
  }
    }
  };

  // Initial connection
  connect();
  return client;
}
    }
  };

  const connect = (): WebSocketInstance => {
    cleanup();

    try {
      ws = new WebSocketImpl(url, protocols) as WebSocketInstance;
      ws.binaryType = binaryType;

      ws.onopen = (event: Event) => {
        log('WebSocket connected');
        reconnectAttempts = 0;
        processMessageQueue();
        onOpen?.(event);
      };

      ws.onclose = (event: CloseEvent) => {
        log('WebSocket closed:', event.code, event.reason);
        onClose?.(event);

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
        log('WebSocket error:', event);
        onError?.(event);
      };

      ws.onmessage = (event: MessageEvent) => {
        messageSubscribers.forEach(callback => callback(event));
        onMessage?.(event);
      };

      return ws;
    } catch (error) {
      log('Connection error:', error);
      throw error;
    }
  };

  // Create the WebSocket client instance
  const client: WebSocketClient = {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    get url() {
      return ws?.url ?? '';
    },
    send(data: string | ArrayBuffer | ArrayBufferView) {
      if (!ws) {
        log('Cannot send message: WebSocket is not initialized');
        return;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // Queue messages while connecting
        messageQueue.push(data);
      } else {
        log('Cannot send message: WebSocket is not open');
      }
    },
    close(code = 1000, reason?: string) {
      if (ws) {
        ws.close(code, reason);
      }
      cleanup();
    },
    reconnect() {
      if (ws) {
        ws.close();
      }
      return connect();
    },
    on(event: 'message', listener: (data: MessageEvent) => void) {
      messageSubscribers.add(listener);
      return () => messageSubscribers.delete(listener);
    },
    [Symbol.asyncIterator](): AsyncIterator<MessageEvent> {
      const stream = createEventStream<MessageEvent>(({ next }) => {
        const unsubscribe = this.on('message', next);
        return () => unsubscribe();
      });
      
      // Ensure the stream is async iterable
      if (typeof stream[Symbol.asyncIterator] !== 'function') {
        throw new Error('EventStream is not async iterable');
      }
      
      return stream[Symbol.asyncIterator]();
    },
  };

  // Initial connection
  connect();

  return client;
): WebSocketClient {
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    WebSocket: CustomWebSocket = getDefaultWebSocket(),
    debug = false,
    protocols = [],
    binaryType = typeof window === 'undefined' ? 'nodebuffer' : 'blob',
    headers = {},
    retryOnError = true,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
    ...rest
  } = options;

  let ws: WebSocketInstance | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let isExplicitClose = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];

  // Create event stream for message handling
  const stream = createEventStream<MessageEvent>(({ 
    next,
    error: onStreamError,
    complete 
  }: {
    next: (value: MessageEvent) => void;
    error: (error: Error) => void;
    complete: () => void;
  }) => {
    const connect = (): WebSocketInstance | null => {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Gets the default WebSocket implementation based on the environment
 * @returns The WebSocket implementation to use
 */
function getDefaultWebSocket(): WebSocketType {
  // Browser environment
  if (typeof WebSocket !== 'undefined') {
    return WebSocket as unknown as WebSocketType;
  }
  
  // Node.js environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ws = require('ws');
    return ws as WebSocketType;
  } catch (e) {
    throw new Error(
      'No WebSocket implementation found. ' +
      'Please provide a WebSocket implementation or ensure the environment provides one.'
    );
  }
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
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    WebSocket: CustomWebSocket = getDefaultWebSocket(),
    debug = false,
    protocols = [],
    binaryType = typeof window === 'undefined' ? 'nodebuffer' : 'blob',
    headers = {},
    retryOnError = true,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
    ...rest
  } = options;

  let ws: WebSocketInstance | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let isExplicitClose = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];

  // Create event stream for message handling
  const stream = createEventStream<MessageEvent>(({ next, error, complete }) => {
    const connect = (): WebSocketInstance | null => {
      if (isExplicitClose) return null;

      try {
        // Clean up any existing connection
        if (ws) {
          ws.onopen = null;
          ws.onclose = null;
          ws.onerror = null;
          ws.onmessage = null;
          ws.close();
        }

        // Create new WebSocket instance
        ws = new CustomWebSocket(url, protocols, { headers }) as WebSocketInstance;
        
        // Set binary type if supported
        if ('binaryType' in ws) {
          ws.binaryType = binaryType;
        }

        // Set up event handlers
        ws.onopen = (event) => {
          if (debug) console.log('[WebSocket] Connected:', url);
          reconnectAttempts = 0;
          
          // Process any queued messages
          while (messageQueue.length > 0 && ws?.readyState === WebSocket.OPEN) {
            const message = messageQueue.shift();
            if (message) {
              ws.send(message);
            }
          }
          
          // Call user-provided callback
          onOpen?.(event);
        };

        ws.onclose = (event) => {
          if (debug) console.log('[WebSocket] Disconnected:', event.code, event.reason);
          
          // Call user-provided callback
          onClose?.(event);
          
          // Attempt to reconnect if not explicitly closed
          if (!isExplicitClose && (retryOnError || event.code !== 1000)) {
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
              reconnectAttempts++;
              
              if (debug) {
                console.log(
                  `[WebSocket] Reconnecting in ${delay}ms... ` +
                  `(attempt ${reconnectAttempts}/${maxReconnectAttempts})`
                );
              }
              
              reconnectTimeout = setTimeout(() => {
                connect();
                onReconnect?.();
              }, delay);
            } else {
              console.error('[WebSocket] Max reconnection attempts reached');
              onMaxReconnectAttempts?.();
            }
          }
        };

        ws.onerror = (event) => {
          console.error('[WebSocket] Error:', event);
          onError?.(event);
        };

        ws.onmessage = (event) => {
          next(event);
          onMessage?.(event);
        };

        return ws;
      } catch (err) {
        const errorMsg = err instanceof Error ? err : new Error(String(err));
        error(errorMsg);
        return null;
      }
    };

    // Initial connection
    connect();

    // Cleanup function
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  });

  // Create the client object
  const client: WebSocketClient = {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    
    get url() {
      return url;
    },
    
    send(data: string | ArrayBuffer | ArrayBufferView): void {
      if (!ws) {
        throw new Error('WebSocket is not connected');
      }
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data as any);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        messageQueue.push(data);
      } else {
        throw new Error('WebSocket is not connected');
      }
    },
    
    close(code?: number, reason?: string): void {
      isExplicitClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      ws?.close(code, reason);
    },
    
    reconnect(): WebSocketClient {
      reconnectAttempts = 0;
      isExplicitClose = false;
      connect();
      return client;
    },
    
    on(event: 'message', listener: (data: MessageEvent) => void): () => void {
      const subscription = stream.subscribe({
        next: listener,
        error: (err) => console.error('WebSocket subscription error:', err),
        complete: () => {}
      });
      
      return () => subscription.unsubscribe();
    },
    
    [Symbol.asyncIterator](): AsyncIterator<MessageEvent> {
      return stream[Symbol.asyncIterator]();
    }
  };
  
  return client;
}

// Type definitions
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

class ConnectionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

type WebSocketType = typeof WebSocket;
type WebSocketInstance = InstanceType<WebSocketType>;
type BinaryType = 'blob' | 'arraybuffer' | 'nodebuffer';

// Extended options for WebSocket client
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

// WebSocket connection options
interface WebSocketConnectionOptions {
  headers?: Record<string, string>;
  protocol?: string | string[];
  binaryType?: BinaryType;
}

// Extend the WebSocket type to include browser and Node.js specific properties
declare global {
  interface WebSocket {
    binaryType: BinaryType;
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
  }
}

// Type definitions for WebSocket implementation
type WebSocketType = typeof WebSocket;
type WebSocketInstance = InstanceType<WebSocketType>;
type BinaryType = 'blob' | 'arraybuffer' | 'nodebuffer';

// Extended options for WebSocket client
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

// WebSocket connection options
interface WebSocketConnectionOptions {
  headers?: Record<string, string>;
  protocol?: string | string[];
}

// Extend the WebSocket type to include browser and Node.js specific properties
declare global {
  interface WebSocket {
    binaryType: 'blob' | 'arraybuffer' | 'nodebuffer';
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
  }
}

type WebSocketType = typeof WebSocket;
type WebSocketInstance = InstanceType<WebSocketType>;
type BinaryType = 'blob' | 'arraybuffer' | 'nodebuffer';

// Helper to get the default WebSocket implementation based on the environment
function getDefaultWebSocket(): WebSocketType {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket as unknown as WebSocketType;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ws = require('ws');
    return ws as WebSocketType;
  } catch (e) {
    throw new Error('No WebSocket implementation found. Please provide a WebSocket implementation or ensure the environment provides one.');
  }
}

class ConnectionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

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

interface ExtendedWebSocketOptions {
  headers?: Record<string, string>;
  protocol?: string | string[];
  binaryType?: BinaryType;
}

export function createWebSocketClient(
  url: string,
  options: ExtendedWebSocketClientOptions = {}
): WebSocketClient {
  const {
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    WebSocket: CustomWebSocket,
    debug = false,
    protocols = [],
    binaryType = typeof window === 'undefined' ? 'nodebuffer' : 'blob',
    headers = {},
    retryOnError = true,
    onOpen,
    onClose,
    onError,
    onMessage,
    onReconnect,
    onMaxReconnectAttempts,
    ...rest
  } = options;

  let ws: WebSocketInstance | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let isExplicitClose = false;
  const messageQueue: Array<string | ArrayBuffer | ArrayBufferView> = [];

  const stream = createEventStream<MessageEvent>(({ next, error, complete }) => {
    const connect = (): WebSocketInstance | null => {
      if (isExplicitClose) return null;

      try {
        const wsOptions: ExtendedWebSocketOptions = { headers };
        if (protocols.length) {
          wsOptions.protocol = protocols;
        }
        
        // Create WebSocket instance based on environment
        ws = new CustomWebSocket(url, protocols, wsOptions) as WebSocketInstance;
        
        // Set binary type if supported
        if ('binaryType' in ws) {
          ws.binaryType = binaryType as BinaryType;
        }

        ws.onopen = (event) => {
          if (debug) logger.info('WebSocket connected:', url);
          reconnectAttempts = 0;
          
          // Process any queued messages
          while (messageQueue.length > 0) {
            const message = messageQueue.shift();
            if (message && ws) ws.send(message as any);
          }
          
          onOpen?.(event);
        };

        ws.onclose = (event) => {
          if (isExplicitClose) return;
          
          if (debug) logger.info('WebSocket closed:', event.code, event.reason);
          
          onClose?.(event);
          
          if (retryOnError && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
            
            if (debug) logger.info(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            reconnectTimeout = setTimeout(() => {
              connect();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            error(new Error(`Max reconnection attempts (${maxReconnectAttempts}) reached`));
          }
        };

        ws.onerror = (event) => {
          const errorEvent = event as unknown as ErrorEvent;
          const errorMessage = errorEvent?.message || 'Unknown WebSocket error';
          if (debug) logger.error('WebSocket error:', errorMessage);
          onError?.(event);
        };

        ws.onmessage = (event) => {
          next(event);
          onMessage?.(event);
        };

        return ws;
      } catch (err) {
        const errorMsg = err instanceof Error ? err : new Error(String(err));
        error(errorMsg);
        return null;
      }
    };

    // Initial connection
    connect();

    return () => {
      isExplicitClose = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws) {
        ws.close();
      }
    };
  });

  const send = (data: string | ArrayBuffer | ArrayBufferView): void => {
    if (!ws) {
      throw new Error('WebSocket is not connected');
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data as any);
    } else if (ws.readyState === WebSocket.CONNECTING) {
      messageQueue.push(data);
    } else {
      throw new Error('WebSocket is not connected');
    }
  };

  const close = (code?: number, reason?: string): void => {
    isExplicitClose = true;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.close(code, reason);
    }
  };

  // Create and return the WebSocket client with proper typing
  const client: WebSocketClient = {
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    get url() {
      return ws?.url ?? url;
    },
    send,
    close,
    reconnect: () => {
      reconnectAttempts = 0;
      const newSocket = connect();
      if (!newSocket) {
        throw new Error('Failed to reconnect WebSocket');
      }
      return client; // Return the client instance for chaining
    },
    on: (event: 'message', listener: (data: MessageEvent) => void) => {
      const subscription = stream.subscribe({
        next: listener,
        error: (err: Error) => {
          logger.error('WebSocket error:', err);
        },
        complete: () => {},
      });
      return () => subscription.unsubscribe();
    },
    [Symbol.asyncIterator]: async function* () {
      for await (const message of stream) {
        yield message;
      }
    },
  };

  return client;
    close,
    reconnect: () => {
      reconnectAttempts = 0;
      const newSocket = connect();
      if (!newSocket) {
        throw new Error('Failed to reconnect WebSocket');
      }
      return client; // Return the client instance for chaining
    },
    on: (event: 'message', listener: (data: MessageEvent) => void) => {
      const subscription = stream.subscribe({
        next: listener,
        error: (err: Error) => console.error('WebSocket error:', err),
        complete: () => {},
      });
      return () => subscription.unsubscribe();
    },
    [Symbol.asyncIterator]: async function* () {
      for await (const message of stream) {
        yield message;
      }
    },
  };
}

function getDefaultWebSocket(): typeof WebSocket {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket;
  }
  
  if (typeof window !== 'undefined' && (window as any).WebSocket) {
    return (window as any).WebSocket;
  }
  
  try {
    // For Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('ws');
  } catch (error) {
    throw new Error(
      'WebSocket implementation not found. ' +
      'Please provide a WebSocket implementation in the options or include a global WebSocket object.'
    );
  }
}
