const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const RateLimiter = require('./rate-limiter');

// Configuration
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-key';
const JWT_ISSUER = 'salahor-ws-server';
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_URL = process.env.REDIS_URL;

// Initialize rate limiter
const rateLimiter = new RateLimiter({
    enabled: NODE_ENV === 'production',
    redisUrl: REDIS_URL,
    defaults: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per window per IP
        message: 'Too many requests, please try again later.',
        statusCode: 429
    }
});

// In-memory store for active connections
const connections = new Map();

// Create HTTP server with rate limiting middleware
const server = http.createServer(async (req, res) => {
    // Apply rate limiting to all HTTP requests
    rateLimiter.httpMiddleware()(req, res, async () => {
        console.log(`HTTP ${req.method} ${req.url}`);
        
        if (req.method === 'GET' && req.url === '/') {
            const stats = await getServerStats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                service: 'websocket-server',
                timestamp: new Date().toISOString(),
                ...stats
            }));
        } else if (req.method === 'POST' && req.url === '/auth/register') {
            handleRegister(req, res);
        } else if (req.method === 'POST' && req.url === '/auth/login') {
            handleLogin(req, res);
        } else if (req.method === 'GET' && req.url.startsWith('/api/messages/')) {
            handleGetMessages(req, res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
});

// Create WebSocket server with rate limiting
const wss = new WebSocket.Server({ 
    server,
    verifyClient: async (info, done) => {
        try {
            // Apply rate limiting to WebSocket connections
            const key = info.req.headers['x-forwarded-for'] || 
                       info.req.socket.remoteAddress;
            
            const { limiter } = rateLimiter.getLimiter(key, 'ws');
            const rateLimitRes = await limiter.consume(key, 1)
                .catch((rateLimitRes) => rateLimitRes);

            if (rateLimitRes.remainingPoints < 0) {
                done(false, 429, 'Connection rate limit exceeded');
                return;
            }

            done(true);
        } catch (error) {
            console.error('WebSocket connection rate limit error:', error);
            done(true); // Allow connection if rate limiting fails
        }
    }
});

// ... [Previous WebSocket server code remains the same until message handling]

// Update the WebSocket message handler to include rate limiting
wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    let user = null;
    let authenticated = false;
    let currentRoom = 'general';
    let messageCount = 0;
    let lastMessageTime = Date.now();

    console.log(`New connection: ${clientId}`);
    
    // Track rate limiting for this connection
    const clientIp = req.headers['x-forwarded-for'] || 
                    req.socket.remoteAddress;
    
    // Initialize rate limiter for this client
    const clientRateLimiter = rateLimiter.getLimiter(`${clientIp}:${clientId}`, 'ws_message').limiter;
    
    // Send initial connection message
    ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        clientId,
        authenticated: false,
        timestamp: new Date().toISOString()
    }));

    // Handle incoming messages with rate limiting
    ws.on('message', async (message) => {
        try {
            const now = Date.now();
            messageCount++;
            
            // Simple in-memory rate limiting as a first line of defense
            if (now - lastMessageTime < 100 && messageCount > 10) {
                // More than 10 messages in 100ms is suspicious
                console.warn(`Rate limit exceeded for client ${clientId}`);
                ws.close(1008, 'Rate limit exceeded');
                return;
            }
            lastMessageTime = now;
            
            // Check rate limit using the rate limiter
            const rateLimitCheck = await clientRateLimiter.consume(1)
                .catch((rateLimitRes) => rateLimitRes);

            if (rateLimitCheck.remainingPoints < 0) {
                ws.send(JSON.stringify({
                    type: 'error',
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many messages. Please slow down.',
                    retryAfter: Math.ceil(rateLimitCheck.msBeforeNext / 1000),
                    timestamp: new Date().toISOString()
                }));
                return;
            }

            // Process the message
            const data = JSON.parse(message);
            
            // Handle authentication
            if (data.type === 'authenticate' && data.token) {
                // ... [existing authentication code]
            }
            
            // Only process other messages if authenticated
            if (!authenticated) {
                ws.send(JSON.stringify({
                    type: 'error',
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString()
                }));
                return;
            }
            
            // Handle different message types
            switch (data.type) {
                case 'message':
                    await handleMessage(ws, clientId, data, currentRoom);
                    break;
                case 'direct':
                    await handleDirectMessage(ws, clientId, data);
                    break;
                case 'join_room':
                    await handleJoinRoom(ws, clientId, data.room);
                    currentRoom = data.room;
                    connections.set(clientId, { ws, user, authenticated, currentRoom });
                    break;
                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'INVALID_MESSAGE_TYPE',
                        message: 'Unknown message type',
                        timestamp: new Date().toISOString()
                    }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                code: 'INVALID_MESSAGE',
                message: 'Invalid message format',
                timestamp: new Date().toISOString()
            }));
        }
    });
    
    // Handle client disconnection
    ws.on('close', async () => {
        console.log(`Client disconnected: ${clientId}`);
        if (user) {
            await db.updateUserStatus(user.id, 'offline');
        }
        connections.delete(clientId);
        broadcastUserList();
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
    
    // Store the connection
    connections.set(clientId, { ws, user, authenticated, currentRoom });
});

// ... [Rest of the WebSocket server code remains the same]

// Update the server startup to handle graceful shutdown with rate limiter
async function startServer() {
    try {
        await db.connect();
        console.log('Database connected successfully');
        
        server.listen(PORT, HOST, () => {
            console.log(`✅ WebSocket server running on ws://${HOST}:${PORT}`);
            console.log(`✅ HTTP server running on http://${HOST}:${PORT}`);
            console.log('\nEndpoints:');
            console.log(`  POST http://${HOST}:${PORT}/auth/register - Register a new user`);
            console.log(`  POST http://${HOST}:${PORT}/auth/login - Login and get JWT token`);
            console.log(`  GET  http://${HOST}:${PORT}/api/messages/:room - Get message history`);
            console.log('\nConnect with WebSocket client:');
            console.log(`  ws://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    
    // Update all users to offline
    await Promise.all(
        Array.from(connections.values())
            .filter(conn => conn.user)
            .map(conn => db.updateUserStatus(conn.user.id, 'offline'))
    );
    
    // Close all WebSocket connections
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close(1001, 'Server shutdown');
        }
    });
    
    // Close the database connection and rate limiter
    await Promise.all([
        db.close(),
        rateLimiter.close()
    ]);
    
    // Close the server
    server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
    });
});

// Start the server
startServer();
