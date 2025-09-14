// Type definitions for WebSocket compatibility between Node.js and browser

declare global {
  // Extend the global WebSocket interface to include Node.js WebSocket types
  interface WebSocket extends globalThis.WebSocket {
    // Common WebSocket properties and methods
    binaryType: BinaryType;
    bufferedAmount: number;
    extensions: string;
    protocol: string;
    readyState: number;
    url: string;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    close(code?: number, reason?: string): void;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    
    // Node.js specific WebSocket methods
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    terminate(): void;
    
    // Event listeners
    addEventListener<K extends keyof WebSocketEventMap>(
      type: K,
      listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof WebSocketEventMap>(
      type: K,
      listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
      options?: boolean | EventListenerOptions
    ): void;
  }

  // WebSocket event map for type safety
  interface WebSocketEventMap {
    close: CloseEvent;
    error: Event;
    message: MessageEvent;
    open: Event;
  }

  // CloseEvent interface for WebSocket close events
  interface CloseEvent extends Event {
    readonly code: number;
    readonly reason: string;
    readonly wasClean: boolean;
  }

  // MessageEvent interface for WebSocket messages
  interface MessageEvent extends Event {
    readonly data: any;
    readonly lastEventId: string;
    readonly origin: string;
    readonly ports: ReadonlyArray<MessagePort>;
    readonly source: MessageEventSource | null;
    initMessageEvent(
      type: string,
      bubbles?: boolean,
      cancelable?: boolean,
      data?: any,
      origin?: string,
      lastEventId?: string,
      source?: MessageEventSource | null,
      ports?: Iterable<MessagePort>
    ): void;
  }

  // Additional types for WebSocket implementation
  type BinaryType = 'nodebuffer' | 'arraybuffer' | 'fragments';
}

export {}; // This file needs to be a module
