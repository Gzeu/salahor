import { vi } from 'vitest';
import { WebSocket } from 'ws';
import type { WebSocket as WS } from 'ws';

// Polyfill for browser-like WebSocket in Node.js
globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

declare global {
  // eslint-disable-next-line no-var
  var WebSocket: typeof WS;
}

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
export * from './utils';
