/**
 * Initializes the Salahor DevTools when imported
 */

import type { 
  StreamInfo, 
  SubscriberCallback, 
  SalahorDevToolsAPI 
} from './types';

// Export types for use in other files
export type { StreamInfo, SubscriberCallback, SalahorDevToolsAPI };

if (typeof window !== 'undefined') {
  if (!window.__SALAHOR_DEVTOOLS__) {
    const streams = new Map<string, StreamInfo>();
    const subscribers = new Set<SubscriberCallback>();
    
    const notifySubscribers = (): void => {
      const snapshot = new Map(streams);
      subscribers.forEach(callback => callback(snapshot));
    };

    window.__SALAHOR_DEVTOOLS__ = {
      streams,
      subscribers,
      
      addStream(id: string, name: string, _stream: EventStream<unknown>): void {
        const streamInfo: StreamInfo = {
          id,
          name,
          value: undefined,
          lastUpdated: Date.now(),
          subscriberCount: 0,
          isPaused: false
        };
        
        streams.set(id, streamInfo);
        notifySubscribers();
      },
      
      removeStream(id: string): void {
        if (streams.delete(id)) {
          notifySubscribers();
        }
      },
      
      updateStream(id: string, updates: Partial<Omit<StreamInfo, 'id'>>): void {
        const stream = streams.get(id);
        if (!stream) return;
        
        Object.assign(stream, { ...updates, lastUpdated: Date.now() });
        notifySubscribers();
      },
      
      subscribe(callback: SubscriberCallback): () => void {
        subscribers.add(callback);
        callback(new Map(streams));
        
        return () => {
          subscribers.delete(callback);
        };
      },
      
      notifySubscribers(): void {
        notifySubscribers();
      },
    };
  }
  
  // Add a small delay to ensure the UI is ready
  setTimeout(() => {
    // Check if we should automatically inject the dev tools UI
    const shouldAutoInject = !document.querySelector('.salahor-devtools-panel');
    
    if (shouldAutoInject && window.__SALAHOR_DEVTOOLS__) {
      // Create a container for the dev tools
      const container = document.createElement('div');
      container.id = 'salahor-devtools-root';
      document.body.appendChild(container);
      
      // Dynamically import and render the dev tools
      import('./SalahorDevTools').then(({ SalahorDevTools }) => {
        const { createRoot } = require('react-dom/client');
        const root = createRoot(container);
        root.render(
          <SalahorDevTools defaultOpen={false} />
        );
      }).catch(console.error);
    }
  }, 100);
}
