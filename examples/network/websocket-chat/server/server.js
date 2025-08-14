import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Create HTTP server
const server = http.createServer((req, res) => {
  // Serve the client HTML file
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, '../client/index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/js/chat.js') {
    // Serve the client JavaScript
    fs.readFile(path.join(__dirname, '../client/js/chat.js'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading chat.js');
      }
      
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
  } else if (req.url === '/css/styles.css') {
    // Serve the CSS
    fs.readFile(path.join(__dirname, '../client/css/styles.css'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading styles.css');
      }
      
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients and chat history
const clients = new Map();
const chatHistory = [];
const MAX_HISTORY = 100;

// Generate a random username
function generateRandomUsername() {
  const adjectives = ['Happy', 'Silly', 'Clever', 'Brave', 'Mysterious', 'Witty', 'Gentle', 'Fierce'];
  const nouns = ['Tiger', 'Panda', 'Eagle', 'Dolphin', 'Fox', 'Owl', 'Lion', 'Wolf'];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// Generate a random color for usernames
function generateRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', 
    '#D4A5A5', '#9B786F', '#E8C07D', '#8FBC94', '#A5B4FC'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Broadcast a message to all connected clients
function broadcast(message, isSystem = false) {
  const messageData = {
    ...message,
    timestamp: new Date().toISOString(),
    isSystem
  };
  
  // Add to chat history
  chatHistory.push(messageData);
  
  // Keep history size in check
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory.shift();
  }
  
  // Broadcast to all connected clients
  const messageString = JSON.stringify(messageData);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  }
}

// Handle new WebSocket connections
wss.on('connection', (ws) => {
  // Generate a unique ID and username for the client
  const clientId = uuidv4();
  const username = generateRandomUsername();
  const userColor = generateRandomColor();
  
  // Store the client
  clients.set(ws, { id: clientId, username, color: userColor });
  
  console.log(`New connection: ${username} (${clientId})`);
  
  // Send welcome message with user info
  ws.send(JSON.stringify({
    type: 'welcome',
    userId: clientId,
    username,
    color: userColor,
    userCount: wss.clients.size,
    timestamp: new Date().toISOString()
  }));
  
  // Send chat history
  if (chatHistory.length > 0) {
    ws.send(JSON.stringify({
      type: 'history',
      messages: chatHistory.slice(-50) // Send last 50 messages
    }));
  }
  
  // Notify other users about the new connection
  broadcast({
    type: 'user-joined',
    userId: clientId,
    username,
    userCount: wss.clients.size,
    timestamp: new Date().toISOString()
  }, true);
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const clientData = clients.get(ws);
      
      if (!clientData) return;
      
      switch (message.type) {
        case 'chat-message':
          // Broadcast the chat message to all clients
          broadcast({
            type: 'chat-message',
            userId: clientData.id,
            username: clientData.username,
            color: clientData.color,
            content: message.content,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'typing':
          // Broadcast typing status to other clients
          broadcast({
            type: 'user-typing',
            userId: clientData.id,
            username: clientData.username,
            isTyping: message.isTyping,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'update-username':
          // Update username and notify others
          const oldUsername = clientData.username;
          clientData.username = message.newUsername || generateRandomUsername();
          
          broadcast({
            type: 'username-changed',
            userId: clientData.id,
            oldUsername,
            newUsername: clientData.username,
            timestamp: new Date().toISOString()
          }, true);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    const clientData = clients.get(ws);
    if (!clientData) return;
    
    console.log(`Client disconnected: ${clientData.username} (${clientData.id})`);
    
    // Remove client from the map
    clients.delete(ws);
    
    // Notify other users about the disconnection
    broadcast({
      type: 'user-left',
      userId: clientData.id,
      username: clientData.username,
      userCount: wss.clients.size,
      timestamp: new Date().toISOString()
    }, true);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('WebSocket server is running');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close all WebSocket connections
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, 'Server is shutting down');
    }
  }
  
  // Close the WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Close the HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});
