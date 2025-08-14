import type { EventStream } from '@salahor/core';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface ConnectorClient<T = any> {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  stream: EventStream<T>;
  state: EventStream<ConnectionState>;
  isConnected: () => boolean;
}

export interface ConnectorOptions {
  /**
   * Whether to automatically connect when the component is mounted
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Maximum number of reconnect attempts
   * @default 5
   */
  maxReconnectAttempts?: number;
  
  /**
   * Base delay (in ms) between reconnect attempts
   * @default 1000
   */
  reconnectDelay?: number;
  
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

export interface UseEventStreamOptions<T = any> extends ConnectorOptions {
  /**
   * Initial data value
   */
  initialData?: T;
  
  /**
   * Whether to automatically subscribe when the component is mounted
   * @default true
   */
  autoSubscribe?: boolean;
  
  /**
   * Transform function for incoming data
   */
  transform?: (data: any) => T;
}

export interface UseConnectorOptions<T = any> extends ConnectorOptions {
  /**
   * Initial data value
   */
  initialData?: T;
  
  /**
   * Whether to automatically connect when the component is mounted
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * Transform function for incoming data
   */
  transform?: (data: any) => T;
}

export interface VuePluginOptions {
  /**
   * Global prefix for all event streams
   * @default 'salahor'
   */
  prefix?: string;
  
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}
