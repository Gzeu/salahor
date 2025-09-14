import WebSocket from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import RateLimiter from './rate-limiter.js';
import BroadcastManager from './broadcast-manager.js';

// Configuration
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-key';
const JWT_ISSUER = 'salahor-ws-server';
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_URL = process.env.REDIS_URL;

// Create HTTP server
const server = http.createServer();

// Initialize rate limiter
const rateLimiter = new RateLimiter({
    enabled: NODE_ENV === 'production',
    redisUrl: REDIS_URL,
    defaults: {
        windowMs: 60 * 1000,
        max: 100,
        message: 'Too many requests, please try again later.',
        statusCode: 429
    }
});

// Initialize broadcast manager
const broadcastManager = new BroadcastManager();

// Track authenticated users and their connections
const authenticatedUsers = new Map(); // userId -> { userId, username, status, lastSeen, connections: Set<clientId> }
const clientToUser = new Map(); // clientId -> userId

// Track active rooms and their members
const activeRooms = new Map(); // roomId -> Set<userId>

// Set up HTTP request handling
server.on('request', async (req, res) => {
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
        } else if (req.method === 'GET' && req.url.startsWith('/api/rooms/')) {
            handleGetRoomInfo(req, res);
        } else if (req.method === 'GET' && req.url.startsWith('/api/users/')) {
            handleGetUserInfo(req, res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
});

// Create WebSocket server with rate limiting
const wss = new WebSocket.Server({ noServer: true });

// WebSocket upgrade handler with rate limiting
server.on('upgrade', async (request, socket, head) => {
    try {
        // Apply rate limiting to WebSocket connections
        const key = request.headers['x-forwarded-for'] || 
                   request.socket.remoteAddress;
        
        const { limiter } = rateLimiter.getLimiter(key, 'ws');
        const rateLimitRes = await limiter.consume(key, 1)
            .catch((rateLimitRes) => rateLimitRes);

        if (rateLimitRes.remainingPoints < 0) {
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } catch (error) {
        console.error('WebSocket upgrade error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
    }
});

// Set up WebSocket connection handler
wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    console.log(`New WebSocket connection: ${clientId}`);

    // Handle WebSocket messages
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

// Handle WebSocket connections
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
    
    // Add client to broadcast manager
    broadcastManager.addClient(clientId, ws);
    
    // Join default room
    broadcastManager.joinRoom(clientId, currentRoom);
    
    // Send initial connection message
    sendToClient({
        type: 'connection',
        status: 'connected',
        clientId,
        authenticated: false,
        currentRoom,
        timestamp: new Date().toISOString()
    });

    // Handle incoming messages with rate limiting
    ws.on('message', async (message) => {
        try {
            const now = Date.now();
            messageCount++;
            
            // Simple in-memory rate limiting as a first line of defense
            if (now - lastMessageTime < 100 && messageCount > 10) {
                console.warn(`Rate limit exceeded for client ${clientId}`);
                ws.close(1008, 'Rate limit exceeded');
                return;
            }
            lastMessageTime = now;
            
            // Check rate limit using the rate limiter
            const rateLimitCheck = await clientRateLimiter.consume(1)
                .catch((rateLimitRes) => rateLimitRes);

            if (rateLimitCheck.remainingPoints < 0) {
                sendToClient({
                    type: 'error',
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many messages. Please slow down.',
                    retryAfter: Math.ceil(rateLimitCheck.msBeforeNext / 1000),
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Process the message
            const data = JSON.parse(message);
            
            // Handle authentication
            if (data.type === 'authenticate' && data.token) {
                await handleAuthentication(data.token);
                return;
            }
            
            // Only process other messages if authenticated
            if (!authenticated) {
                sendToClient({
                    type: 'error',
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            // Handle different message types
            switch (data.type) {
                case 'message':
                    await handleRoomMessage(data.content);
                    break;
                    
                case 'direct':
                    await handleDirectMessage(data.to, data.content, data.messageId);
                    break;
                    
                case 'join_room':
                    await handleJoinRoom(data.room);
                    break;
                    
                case 'typing':
                    handleTypingStatus(data.typing);
                    break;
                    
                case 'presence':
                    handlePresenceUpdate(data.status || 'online');
                    break;
                    
                default:
                    sendToClient({
                        type: 'error',
                        code: 'INVALID_MESSAGE_TYPE',
                        message: 'Unknown message type',
                        timestamp: new Date().toISOString()
                    });
            }
        } catch (error) {
            console.error('Error processing message:', error);
            sendToClient({
                type: 'error',
                code: 'INVALID_MESSAGE',
                message: 'Invalid message format',
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Handle client disconnection
    ws.on('close', async () => {
        console.log(`Client disconnected: ${clientId}`);
        if (user) {
            await updateUserStatus('offline');
            authenticatedUsers.delete(user.id);
        }
        broadcastManager.removeClient(clientId);
        broadcastUserList();
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
    
    // Helper function to send a message to this client
    function sendToClient(message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
    
    // Handle user authentication
    async function handleAuthentication(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
            
            // Update user info
            user = {
                id: decoded.sub,
                username: decoded.username,
                authenticated: true
            };
            
            // Update broadcast manager with user ID
            broadcastManager.setClientUserId(clientId, user.id);
            
            // Update user status
            await updateUserStatus('online');
            
            // Store in authenticated users
            authenticatedUsers.set(user.id, {
                username: user.username,
                lastSeen: new Date(),
                status: 'online'
            });
            
            authenticated = true;
            
            // Send authentication success
            sendToClient({
                type: 'authentication',
                status: 'authenticated',
                user: { 
                    id: user.id, 
                    username: user.username,
                    status: 'online'
                },
                timestamp: new Date().toISOString()
            });
            
            // Load recent messages
            const messages = await db.getMessages(currentRoom, 50);
            sendToClient({
                type: 'message_history',
                room: currentRoom,
                messages: messages.reverse(),
                timestamp: new Date().toISOString()
            });
            
            // Notify others in the room
            broadcastToRoom(currentRoom, {
                type: 'user_joined',
                userId: user.id,
                username: user.username,
                room: currentRoom,
                timestamp: new Date().toISOString()
            });
            
            // Send updated user list
            broadcastUserList();
            
        } catch (error) {
            console.error('Authentication error:', error);
            sendToClient({
                type: 'error',
                code: 'AUTH_ERROR',
                message: 'Invalid or expired token',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // Handle room messages
    async function handleRoomMessage(content) {
        const message = {
            id: uuidv4(),
            type: 'message',
            room: currentRoom,
            from: user.id,
            username: user.username,
            content,
            timestamp: new Date().toISOString()
        };
        
        // Save to database
        await db.saveMessage(message);
        
        // Broadcast to room
        broadcastToRoom(currentRoom, message);
    }
    
    // Handle direct messages
    async function handleDirectMessage(toUserId, content, messageId) {
        if (!toUserId) {
            sendToClient({
                type: 'error',
                code: 'MISSING_RECIPIENT',
                message: 'Recipient ID is required',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        const message = {
            id: messageId || uuidv4(),
            type: 'direct',
            from: user.id,
            to: toUserId,
            fromUsername: user.username,
            content,
            timestamp: new Date().toISOString()
        };
        
        // Save to database
        await db.saveMessage(message);
        
        // Send to recipient
        const recipientConnections = broadcastManager.getUserConnections(toUserId);
        let delivered = false;
        
        if (recipientConnections.size > 0) {
            const messageToRecipient = {
                ...message,
                type: 'direct_message'
            };
            
            // Send to all recipient's connections
            recipientConnections.forEach(connId => {
                if (broadcastManager.sendToClient(connId, messageToRecipient)) {
                    delivered = true;
                }
            });
        }
        
        // Send delivery status to sender
        sendToClient({
            type: 'message_status',
            messageId: message.id,
            status: delivered ? 'delivered' : 'sent',
            timestamp: new Date().toISOString()
        });
        
        // If not delivered, mark as pending
        if (!delivered) {
            // In a real app, you might want to implement offline message queuing here
            console.log(`User ${toUserId} is offline. Message queued.`);
        }
    }
    
    // Handle room joining
    async function handleJoinRoom(roomId) {
        if (!roomId) return;
        
        const previousRoom = currentRoom;
        currentRoom = roomId;
        
        // Leave previous room
        broadcastManager.leaveRoom(clientId, previousRoom);
        
        // Join new room
        broadcastManager.joinRoom(clientId, roomId);
        
        // Load room messages
        const messages = await db.getMessages(roomId, 50);
        
        sendToClient({
            type: 'room_joined',
            previousRoom,
            room: roomId,
            messages: messages.reverse(),
            timestamp: new Date().toISOString()
        });
        
        // Notify others in the room
        broadcastToRoom(roomId, {
            type: 'user_joined',
            userId: user.id,
            username: user.username,
            room: roomId,
            timestamp: new Date().toISOString()
        });
        
        // Update user list
        broadcastUserList();
    }
    
    // Handle typing status
    function handleTypingStatus(isTyping) {
        broadcastToRoom(currentRoom, {
            type: 'user_typing',
            userId: user.id,
            username: user.username,
            isTyping,
            room: currentRoom,
            timestamp: new Date().toISOString()
        }, clientId);
    }
    
    // Handle presence updates
    async function handlePresenceUpdate(status) {
        if (!['online', 'away', 'busy', 'offline'].includes(status)) {
            status = 'online';
        }
        
        await updateUserStatus(status);
        
        // Notify others in the room
        broadcastToRoom(currentRoom, {
            type: 'user_presence',
            userId: user.id,
            username: user.username,
            status,
            timestamp: new Date().toISOString()
        });
        
        // Update user list
        broadcastUserList();
    }
    
    // Update user status in database
    async function updateUserStatus(status) {
        if (!user) return;
        
        const userData = authenticatedUsers.get(user.id) || {
            username: user.username,
            lastSeen: new Date(),
            status: 'offline'
        };
        
        userData.status = status;
        userData.lastSeen = new Date();
        
        authenticatedUsers.set(user.id, userData);
        
        // Update in database
        await db.updateUserStatus(user.id, status);
    }
});

// Helper function to broadcast to a room
export function broadcastToRoom(roomId, message, excludeClientId = null) {
    const count = broadcastManager.broadcastToRoom(roomId, message, excludeClientId);
    
    // Log broadcast for monitoring
    if (process.env.NODE_ENV === 'development') {
        console.log(`Broadcast to room ${roomId}:`, {
            type: message.type,
            from: message.userId || 'system',
            recipients: count,
            timestamp: new Date().toISOString()
        });
    }
    
    return count;
}

// Broadcast updated user list to all clients
async function broadcastUserList() {
    const userList = [];
    
    // Get all connected users with their status
    const userStatus = new Map();
    
    // Add online users first
    for (const [userId, userData] of authenticatedUsers.entries()) {
        userStatus.set(userId, {
            id: userId,
            username: userData.username,
            status: userData.status,
            lastSeen: userData.lastSeen.toISOString()
        });
    }
    
    // Add users from database who might be offline
    // This is a simplified example - in a real app, you'd want to paginate this
    const allUsers = await db.getAllUsers();
    allUsers.forEach(dbUser => {
        if (!userStatus.has(dbUser._id.toString())) {
            userStatus.set(dbUser._id.toString(), {
                id: dbUser._id,
                username: dbUser.username,
                status: 'offline',
                lastSeen: dbUser.lastSeen ? new Date(dbUser.lastSeen).toISOString() : null
            });
        }
    });
    
    // Convert to array
    userList.push(...userStatus.values());
    
    // Broadcast to all connected clients
    broadcastManager.broadcastToAll({
        type: 'user_list',
        users: userList,
        timestamp: new Date().toISOString()
    });
}

// Handle HTTP endpoint to get room info
async function handleGetRoomInfo(req, res) {
    try {
        const roomId = req.url.split('/').pop();
        const usersInRoom = [];
        
        // Get all users in the room
        const clients = broadcastManager.getClientsInRoom(roomId);
        
        clients.forEach(clientId => {
            const client = broadcastManager.getClient(clientId);
            if (client && client.userId) {
                const userData = authenticatedUsers.get(client.userId);
                if (userData) {
                    usersInRoom.push({
                        id: client.userId,
                        username: userData.username,
                        status: userData.status,
                        lastSeen: userData.lastSeen.toISOString()
                    });
                }
            }
        });
        
        // Get recent messages
        const messages = await db.getMessages(roomId, 50);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'success',
            room: roomId,
            userCount: usersInRoom.length,
            users: usersInRoom,
            recentMessages: messages,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error getting room info:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Failed to get room info'
        }));
    }
}

// Handle HTTP endpoint to get user info
async function handleGetUserInfo(req, res) {
    try {
        const userId = req.url.split('/').pop();
        
        // Get user from database
        const user = await db.getUserById(userId);
        if (!user) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                status: 'error',
                message: 'User not found'
            }));
        }
        
        // Get user status
        const userData = authenticatedUsers.get(userId) || {
            status: 'offline',
            lastSeen: user.lastSeen || null
        };
        
        // Get user's connections
        const connections = Array.from(broadcastManager.getUserConnections(userId));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'success',
            user: {
                id: user._id,
                username: user.username,
                status: userData.status,
                lastSeen: userData.lastSeen ? 
                    userData.lastSeen.toISOString() : 
                    (user.lastSeen ? new Date(user.lastSeen).toISOString() : null),
                connectedDevices: connections.length,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString()
            },
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error getting user info:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Failed to get user info'
        }));
    }
}

// Get server statistics
async function getServerStats() {
    const stats = {
        connectedClients: wss.clients.size,
        authenticatedUsers: authenticatedUsers.size,
        totalRooms: broadcastManager.getRoomCount(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
    };
    
    try {
        const dbStats = await db.getStats();
        return { ...stats, ...dbStats };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return stats;
    }
}

// Handle user registration
async function handleRegister(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            const { username, password, email } = JSON.parse(body);
            
            // Validate input
            if (!username || !password) {
                throw new Error('Username and password are required');
            }
            
            // Check if username is already taken
            const existingUser = await db.getUser(username);
            if (existingUser) {
                throw new Error('Username already exists');
            }
            
            // Create user (in a real app, hash the password!)
            const user = {
                username,
                email,
                password: 'hashed-password', // In a real app, use bcrypt
                status: 'offline',
                lastSeen: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Save to database
            const savedUser = await db.createUser(user);
            
            // Generate JWT token
            const token = jwt.sign(
                {
                    sub: savedUser._id.toString(),
                    username: savedUser.username,
                    iss: JWT_ISSUER,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
                },
                JWT_SECRET
            );
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                token,
                user: {
                    id: savedUser._id,
                    username: savedUser.username,
                    email: savedUser.email,
                    status: 'offline',
                    createdAt: savedUser.createdAt,
                    updatedAt: savedUser.updatedAt
                }
            }));
            
        } catch (error) {
            console.error('Registration error:', error);
            const status = error.message.includes('already exists') ? 409 : 400;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: error.message || 'Registration failed'
            }));
        }
    });
}

// Handle user login
async function handleLogin(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            const { username, password } = JSON.parse(body);
            
            // Get user from database
            const user = await db.getUser(username);
            if (!user) {
                throw new Error('Invalid credentials');
            }
            
            // In a real app, verify password hash
            // if (!bcrypt.compareSync(password, user.password)) {
            //     throw new Error('Invalid credentials');
            // }
            
            // Generate JWT token
            const token = jwt.sign(
                {
                    sub: user._id.toString(),
                    username: user.username,
                    iss: JWT_ISSUER,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
                },
                JWT_SECRET
            );
            
            // Update last login
            await db.updateUserStatus(user._id, 'online');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    status: 'online',
                    lastSeen: new Date().toISOString(),
                    createdAt: user.createdAt,
                    updatedAt: new Date()
                }
            }));
            
        } catch (error) {
            console.error('Login error:', error);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: error.message || 'Invalid credentials'
            }));
        }
    });
}

// Start the server
async function startServer() {
    try {
        // Connect to database
        await db.connect();
        console.log('✅ Connected to database');
        
        // Start HTTP/WebSocket server
        server.listen(PORT, HOST, () => {
            console.log(`✅ WebSocket server running on ws://${HOST}:${PORT}`);
            console.log(`✅ HTTP server running on http://${HOST}:${PORT}`);
            console.log('\nEndpoints:');
            console.log(`  POST http://${HOST}:${PORT}/auth/register - Register a new user`);
            console.log(`  POST http://${HOST}:${PORT}/auth/login - Login and get JWT token`);
            console.log(`  GET  http://${HOST}:${PORT}/api/rooms/:room - Get room info`);
            console.log(`  GET  http://${HOST}:${PORT}/api/users/:userId - Get user info`);
            console.log('\nConnect with WebSocket client:');
            console.log(`  ws://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    
    try {
        // Update all users to offline
        const updates = [];
        for (const userId of authenticatedUsers.keys()) {
            updates.push(db.updateUserStatus(userId, 'offline'));
        }
        
        await Promise.all(updates);
        
        // Close all WebSocket connections
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1001, 'Server shutdown');
            }
        });
        
        // Close database and rate limiter
        await Promise.all([
            db.close(),
            rateLimiter.close()
        ]);
        
        // Close the server
        server.close(() => {
            console.log('✅ Server has been shut down');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start the server
startServer();
