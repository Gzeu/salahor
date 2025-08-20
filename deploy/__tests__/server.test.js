const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const { WebSocket } = require('../src/websocket');

describe('WebSocket Server', () => {
  let server;
  let wss;
  let port;

  beforeAll((done) => {
    // Create HTTP server
    server = createServer();
    
    // Create WebSocket server
    wss = new WebSocketServer({ server });
    
    // Start server on random port
    server.listen(0, () => {
      port = server.address().port;
      done();
    });

    // Simple echo server for testing
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        ws.send(`Echo: ${message}`);
      });
    });
  });

  afterAll(() => {
    wss.close();
    server.close();
  });

  test('should connect to the server', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    
    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });
  });

  test('should echo messages', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const testMessage = 'Hello, WebSocket!';
    
    ws.on('open', () => {
      ws.send(testMessage);
    });
    
    ws.on('message', (data) => {
      expect(data).toBe(`Echo: ${testMessage}`);
      ws.close();
      done();
    });
  });
});
