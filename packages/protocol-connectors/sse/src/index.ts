import { createEventStream } from '../../../core/dist/event-stream.js';
import type { 
  SseClient, 
  SseClientOptions, 
  SseEvent, 
  SseServer, 
  SseServerOptions,
  SseConnection,
  NodeRequest,
  NodeResponse,
  SseEventSource
} from './types';

// Declare global EventSource for browser environments
declare global {
  interface Window {
    EventSource: typeof EventSource;
  }
}

/**
 * Default SSE client options
 */
const DEFAULT_OPTIONS: Omit<SseClientOptions, 'headers' | 'body'> = {
  method: 'GET',
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  withCredentials: false,
};

/**
 * Create a new SSE client
 * @param url The URL to connect to
 * @param options Configuration options
 * @returns An SSE client instance
 */
export function createSseClient(
  url: string,
  options: SseClientOptions = {}
): SseClient {
  // Destructure options with defaults
  const {
    autoReconnect = DEFAULT_OPTIONS.autoReconnect,
    reconnectDelay = DEFAULT_OPTIONS.reconnectDelay,
    maxReconnectAttempts = DEFAULT_OPTIONS.maxReconnectAttempts,
    withCredentials = DEFAULT_OPTIONS.withCredentials,
  } = options;

  // Create an event stream for SSE events
  const events = createEventStream<SseEvent>();
  let source: SseEventSource | null = null;
  let isConnected = false;
  let reconnectAttempts = 0;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connect = () => {
    if (source) {
      source.close();
    }

    // Use the browser's EventSource if available, otherwise create a custom one
    // Create the EventSource instance with proper type checking
    source = new EventSource(url, {
      withCredentials,
    }) as unknown as SseEventSource;

    source.onopen = () => {
      isConnected = true;
      reconnectAttempts = 0;
      events.emit({
        type: 'open',
        data: 'Connected to SSE server',
      });
    };
    
    // Set up event listeners with proper typing for environments that don't support addEventListener
    if (!source.addEventListener) {
      const eventSource = source as unknown as { [key: string]: EventListener };
      source.addEventListener = function(type: string, listener: EventListener | EventListenerObject | null) {
        if (!listener) return;
        
        const wrappedListener = (event: Event) => {
          if (type === 'message' && 'handleEvent' in listener) {
            listener.handleEvent(
              new MessageEvent('message', {
                data: (event as unknown as { data: string }).data,
                origin: typeof window !== 'undefined' ? window.location.origin : '',
                lastEventId: '',
                ports: [],
                source: null,
              })
            );
          } else if (typeof listener === 'function') {
            listener(event);
          }
        };
        
        eventSource[`on${type}`] = wrappedListener as EventListener;
      };
    }

    source.onmessage = (event: MessageEvent) => {
      events.emit({
        type: 'message',
        data: event.data,
        id: event.lastEventId || undefined,
      });
    };

    source.onerror = () => {
      isConnected = false;
      events.emit({
        type: 'error',
        data: 'Connection error',
      });

      // Set up auto-reconnection if enabled
      const maxAttempts = maxReconnectAttempts ?? Infinity;
      if (autoReconnect && reconnectAttempts < maxAttempts) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(() => {
          connect();
        }, reconnectDelay);
      } else if (autoReconnect) {
        events.emit({
          type: 'error',
          data: 'Max reconnection attempts reached',
        });
      }
    };
  };

  const close = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (source) {
      source.close();
      source = null;
      isConnected = false;
    }
  };

  const reconnect = () => {
    close();
    reconnectAttempts = 0;
    connect();
  };

  // Initial connection
  connect();

  const client: SseClient = {
    get source() {
      if (!source) {
        throw new Error('SSE connection is closed');
      }
      return source as unknown as EventSource;
    },
    events,
    get isConnected() {
      return isConnected;
    },
    close,
    reconnect,
  };
  
  return client;
}

/**
 * Create a new SSE server
 * @param options Server options
 * @returns An SSE server instance
 */
export function createSseServer(
  options: SseServerOptions = {}
): SseServer {
  const {
    headers = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    keepAlive = true,
    keepAliveInterval = 30000,
    maxConnections = Infinity,
  } = options;

  const connections = new Map<string, SseConnection>();
  const connectionsStream = createEventStream<SseConnection>();
  let keepAliveIntervalId: NodeJS.Timeout | null = null;

  // Create a connection handler for HTTP servers
  const handleRequest: (req: NodeRequest, res: NodeResponse) => void = (req, res) => {
    // Check if we've reached max connections
    if (connections.size >= maxConnections) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many connections' }));
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      ...headers,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Flush headers to establish the connection
    res.flushHeaders();

    const connectionId = Math.random().toString(36).substring(2, 15);
    let isConnected = true;

    const connection: SseConnection = {
      request: req,
      response: res,
      id: connectionId,
      get isConnected() {
        return isConnected;
      },
      send(event) {
        if (!isConnected) return;
        
        let message = '';
        if (event.id) message += `id: ${event.id}\n`;
        if (event.type) message += `event: ${event.type}\n`;
        message += `data: ${event.data}\n\n`;
        
        res.write(message);
      },
      close() {
        if (!isConnected) return;
        isConnected = false;
        connections.delete(connectionId);
        res.end();
      },
    };

    // Add to active connections
    connections.set(connectionId, connection);
    connectionsStream.emit(connection);

    // Handle client disconnect for Node.js environments
    if (typeof req.on === 'function') {
      req.on('close', () => {
        isConnected = false;
        connections.delete(connectionId);
      });
    }
  };

  // Start keep-alive if enabled
  if (keepAlive) {
    keepAliveIntervalId = setInterval(() => {
      connections.forEach(connection => {
        if (connection.isConnected) {
          connection.response.write(':keepalive\n\n');
        }
      });
    }, keepAliveInterval);
  }

  // Cleanup function
  const close = async () => {
    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
      keepAliveIntervalId = null;
    }

    // Close all connections
    connections.forEach(connection => connection.close());
    connections.clear();
  };

  // Broadcast a message to all connected clients
  const broadcast = (event: Omit<SseEvent, 'retry'>) => {
    connections.forEach(connection => {
      if (connection.isConnected) {
        connection.send(event);
      }
    });
  };

  return {
    handleRequest,
    get connections() {
      return connectionsStream;
    },
    get server() {
      return null; // In this implementation, the server is managed by the user
    },
    close,
    broadcast,
  };
}

export * from './types';
