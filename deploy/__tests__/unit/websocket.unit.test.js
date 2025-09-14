const WebSocket = require('ws');
const { WebSocketServer } = require('../../src/server');
const { createMetrics } = require('../../src/monitoring');

// Mock WebSocket server
class MockWebSocketServer {
  constructor() {
    this.clients = new Set();
    this.on = jest.fn((event, callback) => {
      this[`on${event}`] = callback;
    });
  }

  handleConnection(ws) {
    this.clients.add(ws);
    if (this.onconnection) {
      this.onconnection(ws);
    }
  }

  close(callback) {
    this.clients.forEach(ws => ws.terminate());
    this.clients.clear();
    if (callback) callback();
  }
}

describe('WebSocket Server Unit Tests', () => {
  let mockServer;
  let metrics;
  let wss;

  beforeEach(() => {
    // Create mock metrics
    metrics = createMetrics();
    
    // Create mock WebSocket server
    mockServer = new MockWebSocketServer();
    
    // Create WebSocket server instance with mock server
    wss = new WebSocketServer({ port: 0 });
    wss.server = mockServer;
    wss.metrics = metrics;
    
    // Initialize WebSocket server
    wss.setupEventHandlers();
  });

  afterEach(() => {
    // Clean up
    wss.close();
  });

  test('should handle new connection', () => {
    const mockWs = { on: jest.fn() };
    
    // Simulate new connection
    mockServer.handleConnection(mockWs);
    
    // Verify event handlers were set up
    expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    
    // Verify metrics were updated
    expect(metrics.activeConnections.collect()[0].value).toBe(1);
    expect(metrics.totalConnections.collect()[0].value).toBe(1);
  });

  test('should handle message event', () => {
    const mockWs = { 
      on: jest.fn(),
      readyState: WebSocket.OPEN,
      send: jest.fn()
    };
    
    // Simulate new connection
    mockServer.handleConnection(mockWs);
    
    // Get the message handler
    const messageHandler = mockWs.on.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];
    
    expect(messageHandler).toBeDefined();
    
    // Simulate message
    const testMessage = 'test message';
    messageHandler(testMessage);
    
    // Verify message was echoed back
    expect(mockWs.send).toHaveBeenCalledWith(`Echo: ${testMessage}`);
    
    // Verify metrics were updated
    expect(metrics.messagesReceived.collect()[0].value).toBe(1);
    expect(metrics.messagesSent.collect()[0].value).toBe(1);
  });

  test('should handle close event', () => {
    const mockWs = { 
      on: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    // Simulate new connection
    mockServer.handleConnection(mockWs);
    
    // Get the close handler
    const closeHandler = mockWs.on.mock.calls.find(
      call => call[0] === 'close'
    )?.[1];
    
    expect(closeHandler).toBeDefined();
    
    // Simulate close
    closeHandler();
    
    // Verify metrics were updated
    expect(metrics.activeConnections.collect()[0].value).toBe(0);
  });

  test('should handle error event', () => {
    const mockWs = { 
      on: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    // Simulate new connection
    mockServer.handleConnection(mockWs);
    
    // Get the error handler
    const errorHandler = mockWs.on.mock.calls.find(
      call => call[0] === 'error'
    )?.[1];
    
    expect(errorHandler).toBeDefined();
    
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Simulate error
    const testError = new Error('Test error');
    errorHandler(testError);
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('WebSocket error:', testError);
    
    // Verify metrics were updated
    expect(metrics.errors.collect()[0].value).toBe(1);
    
    // Restore console.error
    console.error = originalConsoleError;
  });

  test('should handle server error', () => {
    // Mock console.error
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Simulate server error
    const testError = new Error('Server error');
    mockServer.onerror(testError);
    
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('WebSocket server error:', testError);
    
    // Verify metrics were updated
    expect(metrics.errors.collect().find(m => m.labels.type === 'server_error').value).toBe(1);
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});

describe('Metrics Unit Tests', () => {
  let metrics;
  
  beforeEach(() => {
    metrics = createMetrics();
  });
  
  test('should create metrics with default values', () => {
    expect(metrics.activeConnections).toBeDefined();
    expect(metrics.totalConnections).toBeDefined();
    expect(metrics.messagesReceived).toBeDefined();
    expect(metrics.messagesSent).toBeDefined();
    expect(metrics.messageLatency).toBeDefined();
    expect(metrics.errors).toBeDefined();
  });
  
  test('should track active connections', () => {
    // Initial state
    expect(metrics.activeConnections.collect()[0].value).toBe(0);
    
    // Increment
    metrics.activeConnections.inc();
    expect(metrics.activeConnections.collect()[0].value).toBe(1);
    
    // Decrement
    metrics.activeConnections.dec();
    expect(metrics.activeConnections.collect()[0].value).toBe(0);
  });
  
  test('should track total connections', () => {
    // Initial state
    expect(metrics.totalConnections.collect()[0].value).toBe(0);
    
    // Increment
    metrics.totalConnections.inc();
    expect(metrics.totalConnections.collect()[0].value).toBe(1);
    
    // Increment again
    metrics.totalConnections.inc();
    expect(metrics.totalConnections.collect()[0].value).toBe(2);
  });
  
  test('should track message latency', () => {
    // Record some latencies
    metrics.messageLatency.observe({}, 0.1);
    metrics.messageLatency.observe({}, 0.2);
    metrics.messageLatency.observe({}, 0.3);
    
    // Get the histogram
    const histogram = metrics.messageLatency.collect()[0];
    
    // Verify metrics
    expect(histogram.metricValues).toHaveLength(8); // count, sum, and 6 buckets
    expect(histogram.metricValues[0].value).toBe(3); // count
    expect(histogram.metricValues[1].value).toBeCloseTo(0.6); // sum
  });
});
