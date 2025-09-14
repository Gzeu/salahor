/**
 * WebSocket connector for Salahor
 * Provides a unified interface for working with WebSockets using EventStreams
 */

// Core exports
export { createWebSocketClient, ConnectionError } from './websocket-client';

export type {
  WebSocketClient,
  WebSocketClientOptions,
  BinaryType,
  WebSocketServer,
  WebSocketServerOptions,
} from './types';

// Default export for backward compatibility
import { createWebSocketClient } from './websocket-client';

export default {
  createClient: createWebSocketClient,
};
