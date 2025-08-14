import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, readFile } from 'fs';

// Get the current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enable debug logging
console.log('Server script starting...');
console.log('Current working directory:', process.cwd());
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DEBUG: process.env.DEBUG
});

// Configuration
const PORT = process.env.PORT || 3001;
const MAX_MESSAGE_HISTORY = 100; // Maximum number of messages to keep in history

// In-memory storage (in a real app, use a database)
const users = new Map(); // userId -> user data
const messages = []; // Message history

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.woff2': 'font/woff2',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

console.log('Creating HTTP server...');

// Create HTTP server
const server = createServer(async (req, res) => {
  // Parse URL
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;
  
  // Serve static files from the client directory
  if (req.method === 'GET') {
    // Default to index.html for root
    if (pathname === '/') {
      pathname = '/index.html';
    }
    
    let filePath = join(__dirname, 'client', pathname);
    const ext = extname(filePath);
    
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        // If file doesn't exist, try serving index.html for SPA routing
        if (ext === '') {
          filePath = join(__dirname, 'client', 'index.html');
        } else {
          // If it's a specific file that doesn't exist, return 404
          const notFoundPath = join(__dirname, 'client', '404.html');
          if (existsSync(notFoundPath)) {
            const content = await readFile(notFoundPath);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end(content, 'utf-8');
          } else {
            res.writeHead(404);
            return res.end('Not Found');
          }
        }
      }
      
      // Read and serve the file using a Promise-based approach
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      try {
        const content = await new Promise((resolve, reject) => {
          readFile(filePath, (err, data) => {
            if (err) {
              console.error(`Error reading file ${filePath}:`, err);
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
        
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=0',
          'Content-Length': content.length
        });
        res.end(content, 'utf-8');
      } catch (fileError) {
        console.error(`Error serving file ${filePath}:`, fileError);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      
    } catch (error) {
      console.error('Error serving file:', error);
      res.writeHead(500);
      res.end(`Server Error: ${error.code || 'Unknown error'}`);
    }
  } else {
    // Method not allowed
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

console.log('Creating WebSocket server...');

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Log when WebSocket server is ready
wss.on('listening', () => {
  console.log('WebSocket server is listening');});

// WebSocket server event handlers
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Generate a unique ID for this client
  const userId = generateUserId();
  let username = `User${Math.floor(Math.random() * 10000)}`;
  let userColor = getRandomColor();
  
  // Store the user
  const user = { id: userId, username, color: userColor, ws };
  users.set(userId, user);
  
  // Send welcome message with user ID and initial data
  const welcomeMessage = {
    type: 'welcome',
    userId,
    username,
    color: userColor,
    users: Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      color: u.color
    })),
    messages: messages.slice(-MAX_MESSAGE_HISTORY) // Send recent message history
  };
  
  ws.send(JSON.stringify(welcomeMessage));
  
  // Broadcast user joined to all clients
  broadcast({
    type: 'user_joined',
    userId,
    username,
    users: Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      color: u.color
    }))
  }, ws);
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);
      
      switch (data.type) {
        case 'message':
          handleMessage(user, data.content);
          break;
          
        case 'typing_start':
          broadcast({
            type: 'user_typing',
            userId: user.id,
            username: user.username
          }, ws);
          break;
          
        case 'typing_stop':
          broadcast({
            type: 'user_stopped_typing',
            userId: user.id
          });
          break;
          
        case 'update_username':
          handleUpdateUsername(user, data.newUsername);
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client disconnected: ${username} (${userId})`);
    users.delete(userId);
    
    // Broadcast user left to all clients
    broadcast({
      type: 'user_left',
      userId,
      username,
      users: Array.from(users.values()).map(u => ({
        id: u.id,
        username: u.username,
        color: u.color
      }))
    });
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

/**
 * Handle incoming chat messages
 * @param {Object} sender - The user sending the message
 * @param {string} content - The message content
 */
function handleMessage(sender, content) {
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return;
  }
  
  // Sanitize content (in a real app, use a proper sanitization library)
  const sanitizedContent = content.trim().substring(0, 2000);
  
  // Create message object
  const message = {
    id: Date.now().toString(),
    userId: sender.id,
    username: sender.username,
    content: sanitizedContent,
    timestamp: new Date().toISOString(),
    color: sender.color
  };
  
  // Add to message history
  messages.push(message);
  
  // Keep only the most recent messages
  if (messages.length > MAX_MESSAGE_HISTORY) {
    messages.shift();
  }
  
  // Broadcast message to all clients
  broadcast({
    type: 'message',
    ...message
  });
}

/**
 * Handle username updates
 * @param {Object} user - The user updating their username
 * @param {string} newUsername - The new username
 */
function handleUpdateUsername(user, newUsername) {
  if (!newUsername || typeof newUsername !== 'string' || newUsername.trim() === '') {
    user.ws.send(JSON.stringify({
      type: 'error',
      message: 'Username cannot be empty'
    }));
    return;
  }
  
  // Sanitize username
  const sanitizedUsername = newUsername.trim().substring(0, 30);
  
  // Check if username is already taken
  const isUsernameTaken = Array.from(users.values()).some(
    u => u.id !== user.id && u.username.toLowerCase() === sanitizedUsername.toLowerCase()
  );
  
  if (isUsernameTaken) {
    user.ws.send(JSON.stringify({
      type: 'error',
      message: 'Username is already taken'
    }));
    return;
  }
  
  // Update user data
  const oldUsername = user.username;
  user.username = sanitizedUsername;
  
  // Broadcast username change to all clients
  broadcast({
    type: 'username_updated',
    userId: user.id,
    oldUsername,
    newUsername: sanitizedUsername,
    users: Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      color: u.color
    }))
  });
}

/**
 * Broadcast a message to all connected clients
 * @param {Object} message - The message to broadcast
 * @param {WebSocket} [excludeWs] - Optional WebSocket client to exclude from broadcast
 */
function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === 1) { // 1 = OPEN
      client.send(data, (error) => {
        if (error) {
          console.error('Error sending message:', error);
        }
      });
    }
  });
}

/**
 * Generate a unique user ID
 * @returns {string} A unique user ID
 */
function generateUserId() {
  return 'user_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Generate a random color for a user
 * @returns {string} A hex color code
 */
function getRandomColor() {
  const colors = [
    '#4361ee', '#3f37c9', '#4cc9f0', '#4895ef', '#480ca8',
    '#560bad', '#7209b7', '#b5179e', '#f72585', '#4cc9f0',
    '#2b2d42', '#8d99ae', '#ef233c', '#d90429', '#ff9e00',
    '#2ec4b6', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Start the server
 */
function startServer() {
  return new Promise((resolve, reject) => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      resolve(server);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
      } else {
        console.error('Failed to start server:', error);
      }
      reject(error);
    });
  });
}

/**
 * Gracefully shut down the server
 */
function shutdownServer() {
  console.log('Shutting down server...');
  
  // Close all WebSocket connections
  for (const client of wss.clients) {
    if (client.readyState === 1) { // 1 = OPEN
      client.close(1000, 'Server is shutting down');
    }
  }
  
  // Close the WebSocket server
  return new Promise((resolve) => {
    wss.close(() => {
      console.log('WebSocket server closed');
      resolve();
    });
  }).then(() => {
    // Close the HTTP server
    return new Promise((resolve) => {
      server.close(() => {
        console.log('HTTP server closed');
        resolve();
      });
    });
  });
}

// Handle graceful shutdown
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
let isShuttingDown = false;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  
  try {
    await shutdownServer();
    console.log('Server has been shut down');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
for (const signal of shutdownSignals) {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}`);
    handleShutdown(signal).catch(console.error);
  });
}

// Add unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Log when the process is about to exit
process.on('exit', (code) => {
  console.log(`Process is exiting with code ${code}`);
});

// Always start the server when this module is loaded
console.log('Starting server...');
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Export the server and WebSocket server instances
export { server, wss, startServer, shutdownServer };
