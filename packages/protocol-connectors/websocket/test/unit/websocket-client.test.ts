import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWebSocketClient } from '../../src/client';

// Mock WebSocket implementation that properly implements the WebSocket interface
class MockWebSocket implements WebSocket {
  static CONNECTING = 0 as const;
  static OPEN = 1 as const;
  static CLOSING = 2 as const;
  static CLOSED = 3 as const;

  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  
  // Mock implementations
  send = vi.fn((data: string | ArrayBuffer | Blob | ArrayBufferView): void => {
    // Mock implementation
  });
  
  close = vi.fn((code?: number, reason?: string): void => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      const closeEvent = new Event('close') as CloseEvent;
      Object.defineProperties(closeEvent, {
        code: { value: code },
        reason: { value: reason },
        wasClean: { value: true }
      });
      this.onclose(closeEvent);
    }
  });

  // EventTarget implementation
  addEventListener = vi.fn(<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void => {
    // Simplified implementation for testing
    if (type === 'message' && this.onmessage === null) {
      this.onmessage = listener as any;
    }
  });

  removeEventListener = vi.fn(<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void => {
    // Simplified implementation for testing
    if (type === 'message' && this.onmessage === listener) {
      this.onmessage = null;
    }
  });

  dispatchEvent = jest.fn((event: Event): boolean => {
    // Simplified implementation for testing
    if (event.type === 'message' && this.onmessage) {
      this.onmessage(event as MessageEvent);
    }
    return true;
  });

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
}

describe('WebSocketClient', () => {
  let mockWebSocket: MockWebSocket;
  let originalWebSocket: typeof globalThis.WebSocket;

  beforeEach(() => {
    // Store original WebSocket
    originalWebSocket = globalThis.WebSocket;
    // @ts-ignore
    globalThis.WebSocket = MockWebSocket as any;
    
    // Create a new mock WebSocket instance
    mockWebSocket = new MockWebSocket('ws://test.com');
  });

  afterEach(() => {
    // Restore original WebSocket
    globalThis.WebSocket = originalWebSocket;
    jest.clearAllMocks();
  });

  it('should create a WebSocket client', () => {
    const client = createWebSocketClient('ws://test.com');
    expect(client).toBeDefined();
    // Verify WebSocket was created with correct URL
    expect(mockWebSocket.url).toBe('ws://test.com');
  });

  it('should send messages when connected', async () => {
    const client = createWebSocketClient('ws://test.com');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 20));
    
    client.send('test message');
    expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
  });

  it('should queue messages while connecting', () => {
    const client = createWebSocketClient('ws://test.com');
    
    // Send message before connection is open
    client.send('queued message');
    
    // Verify message was queued but not sent yet
    expect(mockWebSocket.send).not.toHaveBeenCalled();
    
    // After connection, message should be sent
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith('queued message');
        resolve();
      }, 20);
    });
  });

  it('should handle reconnection', async () => {
    const onReconnect = jest.fn();
    createWebSocketClient('ws://test.com', {
      reconnectDelay: 10,
      onReconnect,
    });

    // Wait for initial connection
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Simulate connection close with a code that triggers reconnection
    if (mockWebSocket.onclose) {
      mockWebSocket.readyState = MockWebSocket.CLOSED;
      mockWebSocket.onclose(new CloseEvent('close', { code: 1006 }));
    }

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(onReconnect).toHaveBeenCalled();
    // Verify close was called on the mock
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should handle message events', async () => {
    const onMessage = jest.fn();
    createWebSocketClient('ws://test.com', { onMessage });
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Simulate incoming message
    const testMessage = { data: 'test' };
    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage(testMessage as MessageEvent);
    }
    
    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });
});
