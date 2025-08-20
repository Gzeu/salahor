const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_ISSUER = 'salahor-ws-server';

// In-memory store for active connections
const connections = new Map();

// Create HTTP server
const server = http.createServer(async (req, res) => {
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

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Connect to database when server starts
async function initialize() {
    try {
        await db.connect();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Failed to connect to database:', error);
        process.exit(1);
    }
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    let user = null;
    let authenticated = false;
    let currentRoom = 'general'; // Default room

    console.log(`New connection: ${clientId}`);
    
    // Send initial connection message
    ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        clientId,
        authenticated: false,
        timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            // Handle authentication
            if (data.type === 'authenticate' && data.token) {
                try {
                    const decoded = jwt.verify(data.token, JWT_SECRET, { issuer: JWT_ISSUER });
                    user = {
                        id: decoded.sub,
                        username: decoded.username,
                        authenticated: true
                    };
                    
                    // Update user status in database
                    await db.updateUserStatus(user.id, 'online');
                    
                    authenticated = true;
                    
                    // Send authentication success
                    ws.send(JSON.stringify({
                        type: 'authentication',
                        status: 'authenticated',
                        user: { id: user.id, username: user.username },
                        timestamp: new Date().toISOString()
                    }));
                    
                    // Load recent messages
                    const messages = await db.getMessages(currentRoom, 50);
                    ws.send(JSON.stringify({
                        type: 'message_history',
                        room: currentRoom,
                        messages: messages.reverse(), // Show oldest first
                        timestamp: new Date().toISOString()
                    }));
                    
                    // Update connections map
                    connections.set(clientId, { ws, user, authenticated, currentRoom });
                    
                    // Broadcast updated user list
                    broadcastUserList();
                    return;
                } catch (error) {
                    console.error('Authentication error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        code: 'AUTH_ERROR',
                        message: 'Invalid or expired token',
                        timestamp: new Date().toISOString()
                    }));
                    return;
                }
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
});

// Handle message broadcasting
async function handleMessage(sender, clientId, data, room) {
    const message = {
        id: uuidv4(),
        type: 'message',
        room,
        from: clientId,
        username: connections.get(clientId)?.user?.username || 'anonymous',
        content: data.content,
        timestamp: new Date().toISOString()
    };
    
    // Save to database
    await db.saveMessage(message);
    
    // Broadcast to all clients in the same room
    const messageToSend = { ...message, type: 'message' };
    broadcastToRoom(room, messageToSend, clientId);
}

// Handle direct messages
async function handleDirectMessage(sender, clientId, data) {
    if (!data.to) {
        sender.send(JSON.stringify({
            type: 'error',
            code: 'MISSING_RECIPIENT',
            message: 'Recipient ID is required',
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    const message = {
        id: uuidv4(),
        type: 'direct',
        from: clientId,
        to: data.to,
        username: connections.get(clientId)?.user?.username || 'anonymous',
        content: data.content,
        timestamp: new Date().toISOString()
    };
    
    // Save to database
    await db.saveMessage(message);
    
    // Send to recipient
    const recipient = Array.from(connections.entries())
        .find(([_, conn]) => conn.user?.id === data.to);
    
    if (recipient) {
        const [recipientId, recipientConn] = recipient;
        if (recipientConn.ws.readyState === WebSocket.OPEN) {
            recipientConn.ws.send(JSON.stringify({
                ...message,
                type: 'direct_message'
            }));
        }
    }
    
    // Send delivery confirmation to sender
    sender.send(JSON.stringify({
        type: 'message_delivered',
        messageId: data.messageId,
        to: data.to,
        timestamp: new Date().toISOString()
    }));
}

// Handle room joining
async function handleJoinRoom(ws, clientId, room) {
    const connection = connections.get(clientId);
    if (!connection) return;
    
    // Leave previous room
    const previousRoom = connection.currentRoom;
    
    // Update current room
    connection.currentRoom = room;
    connections.set(clientId, connection);
    
    // Load room messages
    const messages = await db.getMessages(room, 50);
    
    ws.send(JSON.stringify({
        type: 'room_joined',
        previousRoom,
        room,
        messages: messages.reverse(), // Show oldest first
        timestamp: new Date().toISOString()
    }));
    
    // Notify others in the room
    broadcastToRoom(room, {
        type: 'user_joined',
        userId: connection.user.id,
        username: connection.user.username,
        room,
        timestamp: new Date().toISOString()
    }, clientId);
}

// Broadcast to all clients in a room
export function broadcastToRoom(room, message, excludeClientId = null) {
    wss.clients.forEach((client) => {
        const clientEntry = Array.from(connections.entries())
            .find(([_, conn]) => conn.ws === client);
            
        if (client.readyState === WebSocket.OPEN && 
            clientEntry && 
            clientEntry[1].currentRoom === room &&
            clientEntry[0] !== excludeClientId) {
            client.send(JSON.stringify(message));
        }
    });
}

// Broadcast updated user list to all clients
async function broadcastUserList() {
    const userList = Array.from(connections.values())
        .filter(conn => conn.authenticated && conn.user)
        .map(conn => ({
            id: conn.user.id,
            username: conn.user.username,
            room: conn.currentRoom,
            status: 'online'
        }));
    
    const message = {
        type: 'user_list',
        users: userList,
        timestamp: new Date().toISOString()
    };
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Get server statistics
async function getServerStats() {
    const stats = {
        connectedClients: wss.clients.size,
        authenticatedClients: Array.from(connections.values())
            .filter(conn => conn.authenticated).length,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
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
            
            // In a real app, you would:
            // 1. Validate input
            // 2. Hash the password
            // 3. Store user in database
            
            // For demo purposes, we'll just create a token
            const user = {
                username,
                email,
                password: 'hashed-password' // In a real app, hash this!
            };
            
            const dbUser = await db.createUser(user);
            const token = generateToken({ 
                username: user.username,
                sub: dbUser._id.toString()
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                token,
                user: { 
                    id: dbUser._id,
                    username: user.username,
                    email: user.email
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
            
            // In a real app, you would:
            // 1. Find user by username
            // 2. Verify password hash
            // 3. Generate token
            
            const user = await db.getUser(username);
            if (!user) {
                throw new Error('User not found');
            }
            
            // In a real app, verify password hash
            // if (!verifyPassword(password, user.password)) {
            //     throw new Error('Invalid credentials');
            // }
            
            const token = generateToken({ 
                username: user.username,
                sub: user._id.toString()
            });
            
            // Update last login
            await db.updateUserStatus(user._id, 'online');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                token,
                user: { 
                    id: user._id,
                    username: user.username,
                    email: user.email
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

// Handle getting message history
async function handleGetMessages(req, res) {
    try {
        const room = req.url.split('/').pop();
        const before = req.headers['x-before'];
        const limit = parseInt(req.headers['x-limit']) || 50;
        
        const messages = await db.getMessages(room, limit, before);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'success',
            room,
            count: messages.length,
            messages,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Failed to fetch messages'
        }));
    }
}

// Generate JWT token
function generateToken(payload) {
    return jwt.sign(
        {
            ...payload,
            iss: JWT_ISSUER,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        },
        JWT_SECRET
    );
}

// Initialize and start the server
async function startServer() {
    try {
        await initialize();
        
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
    
    // Close the database connection
    await db.close();
    
    // Close the server
    server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
    });
});

// Start the server
startServer();
