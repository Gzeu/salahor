const client = require('prom-client');
const express = require('express');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics and prefix them
client.collectDefaultMetrics({
  app: 'websocket_server',
  prefix: 'websocket_',
  timeout: 10000,
  gcDurationBuckets: [0.1, 0.2, 0.5, 1, 2, 5],
  register
});

// Create custom metrics
const metrics = {
  // Connection metrics
  activeConnections: new client.Gauge({
    name: 'websocket_active_connections',
    help: 'Number of active WebSocket connections',
    labelNames: ['path'],
    registers: [register]
  }),
  
  totalConnections: new client.Counter({
    name: 'websocket_connections_total',
    help: 'Total number of WebSocket connections',
    labelNames: ['path'],
    registers: [register]
  }),
  
  connectionErrors: new client.Counter({
    name: 'websocket_connection_errors_total',
    help: 'Total number of WebSocket connection errors',
    labelNames: ['type'],
    registers: [register]
  }),
  
  // Message metrics
  messagesReceived: new client.Counter({
    name: 'websocket_messages_received_total',
    help: 'Total number of messages received',
    labelNames: ['path'],
    registers: [register]
  }),
  
  messagesSent: new client.Counter({
    name: 'websocket_messages_sent_total',
    help: 'Total number of messages sent',
    labelNames: ['path'],
    registers: [register]
  }),
  
  // Performance metrics
  messageLatency: new client.Histogram({
    name: 'websocket_message_latency_seconds',
    help: 'Latency of message processing in seconds',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    labelNames: ['path'],
    registers: [register]
  }),
  
  // Error metrics
  errors: new client.Counter({
    name: 'websocket_errors_total',
    help: 'Total number of WebSocket errors',
    labelNames: ['type'],
    registers: [register]
  })
};

// Create Express app for metrics endpoint
const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start metrics server
function startMetricsServer(port = 9091) {
  return app.listen(port, () => {
    console.log(`Metrics server running on http://localhost:${port}`);
    console.log(`Metrics available at http://localhost:${port}/metrics`);
  });
}

module.exports = {
  metrics,
  startMetricsServer,
  register
};
