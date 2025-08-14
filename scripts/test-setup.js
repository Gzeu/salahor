// Test setup for the monorepo
// This file is run before each test file

// Set up global test environment
process.env.NODE_ENV = 'test';

// Add custom matchers and utilities
global.expect.extend({
  /**
   * Custom matcher to check if a value is an async iterable
   */
  toBeAsyncIterable(received) {
    const pass = 
      received != null && 
      typeof received[Symbol.asyncIterator] === 'function';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be an async iterable`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be an async iterable`,
        pass: false,
      };
    }
  },
  
  /**
   * Custom matcher to check if a value is an EventTarget
   */
  toBeEventTarget(received) {
    const pass = 
      received != null &&
      typeof received.addEventListener === 'function' &&
      typeof received.removeEventListener === 'function' &&
      typeof received.dispatchEvent === 'function';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be an EventTarget`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be an EventTarget`,
        pass: false,
      };
    }
  },
});

// Mock common browser APIs if running in Node.js
if (typeof window === 'undefined') {
  const { Event, EventTarget } = require('event-target-shim');
  global.Event = Event;
  global.EventTarget = EventTarget;
  
  // Mock WebSocket if needed
  if (typeof WebSocket === 'undefined') {
    global.WebSocket = class WebSocket {
      constructor() {
        throw new Error('WebSocket is not available in this environment');
      }
    };
  }
}

// Add a test timeout
jest.setTimeout(10000); // 10 seconds

// Setup cleanup
let testStartTime;

beforeEach(() => {
  testStartTime = Date.now();
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  const testDuration = Date.now() - testStartTime;
  if (testDuration > 1000) {
    console.warn(`Test took ${testDuration}ms to complete`);
  }
});
