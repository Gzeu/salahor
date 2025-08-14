import type { EventStream } from '@salahor/core';

export interface StreamInfo {
  id: string;
  name: string;
  value: any;
  lastUpdated: number;
  subscriberCount: number;
  isPaused: boolean;
}

export type SubscriberCallback = (streams: Map<string, StreamInfo>) => void;

export interface SalahorDevToolsAPI {
  streams: Map<string, StreamInfo>;
  subscribers: Set<SubscriberCallback>;
  addStream: (id: string, name: string, stream: EventStream<unknown>) => void;
  removeStream: (id: string) => void;
  updateStream: (id: string, updates: Partial<Omit<StreamInfo, 'id'>>) => void;
  subscribe: (callback: SubscriberCallback) => () => void;
  notifySubscribers: () => void;
}

declare global {
  interface Window {
    __SALAHOR_DEVTOOLS__?: SalahorDevToolsAPI;
  }
}
