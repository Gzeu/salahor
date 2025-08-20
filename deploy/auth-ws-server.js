const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');

// Configuration
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_ISSUER = 'salahor-ws-server';

// In-memory user store (replace with a real database in production)
const users = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
    console.log(`HTTP ${req.method} ${req.url}`);
    
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'websocket-server',
            authenticated: false,
            authenticatedClients: Array.from(users.values()).filter(u => u.authenticated).length,
            totalClients: users.size,
            timestamp: new Date().toISOString()
        }));
    } else if (req.method === 'POST' && req.url === '/auth/register') {
        handleRegister(req, res);
    } else if (req.method === 'POST' && req.url === '/auth/login') {
        handleLogin(req, res);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track authenticated connections
const connections = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    const clientId = Date.now();
    let user = null;
    let authenticated = false;

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
    ws.on('message', (message) => {
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
                    users.set(clientId, user);
                    authenticated = true;
                    
                    ws.send(JSON.stringify({
                        type: 'authentication',
                        status: 'authenticated',
                        user: { id: user.id, username: user.username },
                        timestamp: new Date().toISOString()
                    }));
                    
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
                    handleMessage(ws, clientId, data);
                    break;
                case 'direct':
                    handleDirectMessage(ws, clientId, data);
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
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        users.delete(clientId);
        connections.delete(clientId);
        broadcastUserList();
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    });
    
    // Store the connection
    connections.set(clientId, { ws, user, authenticated });
});

// Handle user registration
async function handleRegister(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', async () => {
        try {
            const { username, password } = JSON.parse(body);
            
            // In a real app, you would:
            // 1. Validate input
            // 2. Hash the password
            // 3. Store user in database
            
            // For demo purposes, we'll just create a token
            const token = generateToken({ username });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                token,
                user: { username }
            }));
        } catch (error) {
            console.error('Registration error:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: 'Invalid registration data'
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
            
            // For demo purposes, we'll just create a token
            const token = generateToken({ username });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                token,
                user: { username }
            }));
        } catch (error) {
            console.error('Login error:', error);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: 'Invalid credentials'
            }));
        }
    });
}

// Handle broadcast messages
function handleMessage(sender, clientId, data) {
    const message = {
        type: 'message',
        from: clientId,
        username: users.get(clientId)?.username || 'anonymous',
        content: data.content,
        timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Handle direct messages
function handleDirectMessage(sender, clientId, data) {
    if (!data.to) {
        sender.send(JSON.stringify({
            type: 'error',
            code: 'MISSING_RECIPIENT',
            message: 'Recipient ID is required',
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    const recipient = connections.get(parseInt(data.to));
    if (!recipient || !recipient.authenticated) {
        sender.send(JSON.stringify({
            type: 'error',
            code: 'INVALID_RECIPIENT',
            message: 'Recipient not found or not authenticated',
            timestamp: new Date().toISOString()
        }));
        return;
    }
    
    const message = {
        type: 'direct',
        from: clientId,
        to: data.to,
        username: users.get(clientId)?.username || 'anonymous',
        content: data.content,
        timestamp: new Date().toISOString()
    };
    
    // Send to recipient
    if (recipient.ws.readyState === WebSocket.OPEN) {
        recipient.ws.send(JSON.stringify(message));
    }
    
    // Send delivery confirmation to sender
    sender.send(JSON.stringify({
        type: 'message_delivered',
        messageId: data.messageId,
        to: data.to,
        timestamp: new Date().toISOString()
    }));
}

// Broadcast updated user list to all clients
function broadcastUserList() {
    const userList = Array.from(users.entries())
        .filter(([_, user]) => user.authenticated)
        .map(([id, user]) => ({
            id,
            username: user.username,
            lastActive: user.lastActive
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

// Generate JWT token
function generateToken(payload) {
    return jwt.sign(
        {
            ...payload,
            sub: Date.now().toString(),
            iss: JWT_ISSUER,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
        },
        JWT_SECRET
    );
}

// Start the server
server.listen(PORT, HOST, () => {
    console.log(`✅ WebSocket server running on ws://${HOST}:${PORT}`);
    console.log(`✅ HTTP server running on http://${HOST}:${PORT}`);
    console.log('\nEndpoints:');
    console.log(`  POST http://${HOST}:${PORT}/auth/register - Register a new user`);
    console.log(`  POST http://${HOST}:${PORT}/auth/login - Login and get JWT token`);
    console.log('\nTo test the WebSocket connection, use a WebSocket client to connect to:');
    console.log(`  ws://${HOST}:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        console.log('Try these steps:');
        console.log(`1. Close any other running instances`);
        console.log(`2. Use a different port (set PORT environment variable)`);
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close(1001, 'Server shutdown');
        }
    });
    server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
    });
});
