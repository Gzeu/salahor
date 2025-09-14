const WebSocket = require('ws');
const { metrics } = require('./monitoring');

class MonitoredWebSocketServer extends WebSocket.Server {
  constructor(options) {
    super(options);
    this.path = options.path || '/';
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('connection', (ws, req) => {
      const startTime = process.hrtime();
      const path = req.url || this.path;
      
      // Track connection
      metrics.activeConnections.inc({ path });
      metrics.totalConnections.inc({ path });
      
      // Track messages
      ws.on('message', (message) => {
        metrics.messagesReceived.inc({ path });
        
        // Echo the message back
        if (ws.readyState === WebSocket.OPEN) {
          const sendStart = process.hrtime();
          ws.send(`Echo: ${message}`, (error) => {
            if (error) {
              metrics.errors.inc({ type: 'message_send_error' });
              return;
            }
            const [seconds, nanoseconds] = process.hrtime(sendStart);
            const latency = seconds + nanoseconds / 1e9;
            metrics.messageLatency.observe({ path }, latency);
            metrics.messagesSent.inc({ path });
          });
        }
      });
      
      // Handle close
      ws.on('close', () => {
        metrics.activeConnections.dec({ path });
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        metrics.errors.inc({ type: 'websocket_error' });
      });
    });
    
    // Track server errors
    this.on('error', (error) => {
      console.error('WebSocket server error:', error);
      metrics.errors.inc({ type: 'server_error' });
    });
  }
}

module.exports = MonitoredWebSocketServer;
