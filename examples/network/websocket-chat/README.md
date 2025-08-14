# WebSocket Chat Example

A real-time chat application built with Node.js and WebSockets. This example demonstrates how to create a full-stack chat application with a React/Vue frontend and a Node.js backend using the WebSocket protocol.

## Features

- Real-time messaging with WebSockets
- User list with online/offline status
- Typing indicators
- Username customization
- Responsive design that works on desktop and mobile
- Light/dark theme support
- Message history
- Emoji picker
- Sound notifications
- Cross-tab synchronization

## Prerequisites

- Node.js (v14 or later)
- npm or pnpm (recommended)

## Project Structure

```
websocket-chat/
├── client/                 # Frontend code
│   ├── css/                # CSS styles
│   │   ├── base.css        # Base styles and variables
│   │   ├── sidebar.css     # Sidebar styles
│   │   ├── chat.css        # Chat area styles
│   │   ├── modals.css      # Modal dialog styles
│   │   └── styles.css      # Main stylesheet (imports all others)
│   ├── js/
│   │   └── chat.js         # Client-side JavaScript
│   └── index.html          # Main HTML file
└── server.js               # WebSocket server
```

## Getting Started

1. **Clone the repository** (if you haven't already)

2. **Install dependencies**
   ```bash
   # Navigate to the example directory
   cd examples/network/websocket-chat
   
   # Install dependencies
   npm install
   # or with pnpm
   pnpm install
   ```

3. **Start the server**
   ```bash
   node server.js
   ```
   The server will start on `http://localhost:3001` by default.

4. **Open the application**
   Open your web browser and navigate to `http://localhost:3001`

5. **Start chatting!**
   - Enter a username when prompted
   - Share the URL with others to chat together

## Available Scripts

- `node server.js` - Start the WebSocket server and serve static files
- `node server.js --port 3000` - Start the server on a custom port

## Environment Variables

You can configure the server using the following environment variables:

- `PORT` - The port to run the server on (default: 3001)
- `NODE_ENV` - Set to 'production' for production mode

## How It Works

### Client-Side

The client is a single-page application that connects to the WebSocket server. It handles:

- Establishing and maintaining the WebSocket connection
- Sending and receiving messages
- Updating the UI in real-time
- Managing user state and preferences
- Handling user interactions

### Server-Side

The server is built with Node.js and the `ws` WebSocket library. It handles:

- Managing WebSocket connections
- Broadcasting messages to all connected clients
- Maintaining the list of online users
- Storing message history (in-memory)
- Handling user disconnections

## Message Protocol

The client and server communicate using JSON messages with the following structure:

```typescript
interface Message {
  type: string;           // Message type (e.g., 'message', 'user_joined', etc.)
  userId: string;         // Sender's user ID
  username?: string;      // Sender's username
  content?: string;       // Message content (for chat messages)
  timestamp?: string;     // ISO timestamp
  color?: string;         // User's color
  users?: User[];         // List of online users
  messages?: Message[];   // Message history (sent on connection)
}

interface User {
  id: string;
  username: string;
  color: string;
}
```

### Message Types

- `welcome`: Sent to a client when they first connect
- `message`: A chat message from a user
- `user_joined`: Broadcast when a new user connects
- `user_left`: Broadcast when a user disconnects
- `user_typing`: Indicates a user is typing
- `user_stopped_typing`: Indicates a user stopped typing
- `username_updated`: Broadcast when a user changes their username
- `error`: An error message

## Customization

### Styling

You can customize the appearance by modifying the CSS files in the `client/css/` directory. The application uses CSS variables for theming, making it easy to change colors and other design tokens.

### Configuration

You can modify the server configuration in `server.js`:

- `MAX_MESSAGE_HISTORY`: Maximum number of messages to keep in history
- `PORT`: Server port (can also be set via environment variable)

## Security Considerations

This is a basic example and may need additional security measures for production use:

- Add authentication
- Sanitize user input
- Rate limiting
- Use WSS (secure WebSockets) in production
- Consider using a database for message persistence
- Implement proper error handling and logging

## Browser Support

The application works in all modern browsers that support WebSockets and ES6+ JavaScript.

## License

This project is part of the Salahor monorepo and is licensed under the MIT License.
