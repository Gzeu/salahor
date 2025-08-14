import { vi } from 'vitest';
// Mock the @salahor/core module with all actual implementations
// and override specific functions as needed for testing
vi.mock('@salahor/core', async () => {
    const actual = await vi.importActual('@salahor/core');
    return {
        ...actual,
        fileExists: vi.fn().mockResolvedValue(true),
        isDevelopment: vi.fn().mockReturnValue(false),
        devLogger: {
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        },
    };
});
// Set up global mocks for WebSocket if needed
class MockWebSocket extends EventTarget {
    constructor(url, _protocols) {
        super();
        this.binaryType = 'arraybuffer';
        this.bufferedAmount = 0;
        this.extensions = '';
        this.protocol = '';
        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
        this.onopen = null;
        this.CLOSED = MockWebSocket.CLOSED;
        this.CLOSING = MockWebSocket.CLOSING;
        this.CONNECTING = MockWebSocket.CONNECTING;
        this.OPEN = MockWebSocket.OPEN;
        this.send = vi.fn();
        this.close = vi.fn();
        this.url = url.toString();
        this.readyState = MockWebSocket.CONNECTING;
        // Simulate connection after a short delay
        setTimeout(() => {
            if (this.readyState === MockWebSocket.CONNECTING) {
                this.readyState = MockWebSocket.OPEN;
                this.dispatchEvent(new Event('open'));
            }
        }, 10);
    }
    // Required WebSocket methods
    addEventListener(type, listener, options) {
        super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
        super.removeEventListener(type, listener, options);
    }
    dispatchEvent(event) {
        return super.dispatchEvent(event);
    }
}
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;
// Make WebSocket available globally for testing
globalThis.WebSocket = MockWebSocket;
// Mock the ErrorEvent class
class ErrorEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.colno = eventInitDict?.colno ?? 0;
        this.error = eventInitDict?.error;
        this.filename = eventInitDict?.filename ?? '';
        this.lineno = eventInitDict?.lineno ?? 0;
        this.message = eventInitDict?.message ?? '';
    }
}
globalThis.ErrorEvent = ErrorEvent;
// Mock the CloseEvent class
class MockCloseEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        this.code = eventInitDict?.code ?? 1000;
        this.reason = eventInitDict?.reason ?? '';
        this.wasClean = eventInitDict?.wasClean ?? true;
    }
}
globalThis.CloseEvent = MockCloseEvent;
//# sourceMappingURL=setup.js.map