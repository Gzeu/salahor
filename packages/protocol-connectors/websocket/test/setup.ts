import { vi } from 'vitest';
import { WebSocket } from 'ws';

// Polyfill for browser-like WebSocket in Node.js
declare global {
  // Extend the global WebSocket type to match the 'ws' implementation
  interface WebSocket {
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
  }
  
  // Declare the global WebSocket constructor
  var WebSocket: {
    prototype: WebSocket;
    new(url: string | URL, protocols?: string | string[]): WebSocket;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSING: 2;
    readonly CLOSED: 3;
  };
}

// Assign the WebSocket implementation from 'ws' to the global scope
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

// Mock console methods to avoid polluting test output
const originalConsole = { ...console };
const mockConsole = {
  ...originalConsole,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Replace console with mock in test environment
if (process.env.NODE_ENV === 'test') {
  global.console = mockConsole as Console;
}

// Cleanup after tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Export test utilities
export * from './utils/utils';
