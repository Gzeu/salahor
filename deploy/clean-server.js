import { WebSocketServer } from 'ws';
import http from 'http';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

// Rate limiting
class RateLimiter {
  constructor(windowMs, max) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map();
  }

  check(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Clean up old entries
    for (const [key, timestamp] of this.hits.entries()) {
      if (timestamp < windowStart) {
        this.hits.delete(key);
      }
    }

    // Check rate limit
    const count = Array.from(this.hits.values())
      .filter(timestamp => timestamp > windowStart)
      .length;

    if (count >= this.max) {
      return false;
    }

    this.hits.set(ip, now);
    return true;
  }
}

// Configuration
const config = {
  PORT: process.env.PORT || 4001, // Changed default port to 4001
  HOST: process.env.HOST || '0.0.0.0', // Listen on all network interfaces
  NODE_ENV: process.env.NODE_ENV || 'development',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per window
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// Logger
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message, meta = {}) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  },
  debug: (message, meta = {}) => {
    if (config.NODE_ENV === 'development') {
      console.debug(JSON.stringify({ level: 'debug', message, ...meta, timestamp: new Date().toISOString() }));
    }
  }
};

// Initialize rate limiter
const rateLimiter = new RateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX);

// Configuration
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';

// Request validation
function validateMessage(message) {
  try {
    const msg = JSON.parse(message);
    if (!msg.type) {
      throw new Error('Message type is required');
    }
    return msg;
  } catch (error) {
    throw new Error(`Invalid message format: ${error.message}`);
  }
}

// Get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.socket.remoteAddress || 
         req.connection.remoteAddress;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const clientIp = getClientIp(req);
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    const healthCheck = {
      status: 'ok',
      service: 'websocket-server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node: process.version
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthCheck));
    return;
  }
  
  // Handle 404
  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Track connected clients
const clients = new Map();

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const clientIp = getClientIp(request);
  
  // Rate limiting
  if (!rateLimiter.check(clientIp)) {
    logger.warn('Rate limit exceeded', { clientIp });
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }
  
  const clientId = randomUUID();
  logger.info('New WebSocket connection', { clientId, clientIp });
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Store client
    clients.set(clientId, {
      ws,
      ip: clientIp,
      connectedAt: new Date().toISOString(),
      lastActivity: Date.now()
    });
    
    // Send welcome message
    const welcomeMsg = {
      type: 'connection_established',
      clientId,
      timestamp: new Date().toISOString(),
      config: {
        maxMessageSize: 1024 * 1024, // 1MB
        pingInterval: 30000, // 30 seconds
        reconnect: true
      }
    };
    
    ws.send(JSON.stringify(welcomeMsg));
    
    // Handle messages
    ws.on('message', (data) => {
      try {
        // Update last activity
        const client = clients.get(clientId);
        if (client) {
          client.lastActivity = Date.now();
        }
        
        // Validate message
        const message = validateMessage(data);
        logger.debug('Message received', { clientId, message });
        
        // Process message (echo for now)
        const response = {
          ...message,
          receivedAt: new Date().toISOString(),
          serverTimestamp: Date.now()
        };
        
        ws.send(JSON.stringify(response));
        
      } catch (error) {
        logger.error('Error processing message', { 
          clientId, 
          error: error.message,
          stack: error.stack 
        });
        
        // Send error to client
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      logger.info('Client disconnected', { clientId, clientIp });
      clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', { 
        clientId, 
        error: error.message,
        stack: error.stack 
      });
      clients.delete(clientId);
    });
  });
});

// Start server
server.listen(config.PORT, config.HOST, () => {
  logger.info(`Server started`, {
    host: config.HOST,
    port: config.PORT,
    environment: config.NODE_ENV,
    pid: process.pid
  });
  
  // Log memory usage every 5 minutes
  if (config.NODE_ENV === 'production') {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      logger.info('Memory usage', {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB',
        arrayBuffers: (memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB',
        clients: clients.size
      });
    }, 5 * 60 * 1000);
  }
});

// Handle graceful shutdown
const shutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  // Close all WebSocket connections
  clients.forEach((client, clientId) => {
    try {
      client.ws.close(1001, 'Server shutdown');
      logger.info('Closed client connection', { clientId });
    } catch (error) {
      logger.error('Error closing client connection', { clientId, error: error.message });
    }
  });
  
  // Close the server
  server.close(() => {
    logger.info('Server has been shut down');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  // Don't exit immediately, let the process finish its current operations
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { 
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Start the server
server.listen(config.PORT, config.HOST, () => {
  logger.info('Server started', {
    host: config.HOST,
    port: config.PORT,
    environment: config.NODE_ENV,
    pid: process.pid
  });
});
