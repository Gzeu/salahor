# WebSocket Server with JWT Authentication

This is a secure WebSocket server implementation with JWT-based authentication. It provides real-time communication capabilities with user authentication, message broadcasting, and direct messaging.

## Features

- **JWT Authentication**: Secure token-based authentication
- **User Management**: Register and login users
- **Real-time Messaging**: Broadcast and direct messaging
- **User Presence**: Track online users in real-time
- **RESTful HTTP API**: For user registration and login
- **Error Handling**: Comprehensive error handling and validation

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your configuration:
   ```env
   PORT=4000
   HOST=localhost
   JWT_SECRET=your-secure-secret-key
   ```

## Usage

### Starting the Server

```bash
node auth-ws-server.js
```

Or with environment variables:

```bash
PORT=4000 JWT_SECRET=your-secret-key node auth-ws-server.js
```

### API Endpoints

#### Register a New User

```http
POST /auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword123"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword123"
}
```

### WebSocket Connection

1. Connect to the WebSocket server:
   ```javascript
   const ws = new WebSocket('ws://localhost:4000');
   ```

2. Authenticate with the JWT token:
   ```javascript
   ws.send(JSON.stringify({
     type: 'authenticate',
     token: 'your.jwt.token.here'
   }));
   ```

3. Send messages:
   ```javascript
   // Broadcast message
   ws.send(JSON.stringify({
     type: 'message',
     content: 'Hello, everyone!'
   }));

   // Direct message
   ws.send(JSON.stringify({
     type: 'direct',
     to: 'recipient-client-id',
     content: 'Private message',
     messageId: Date.now() // Optional message ID for delivery tracking
   }));
   ```

## Message Types

### From Server to Client

- `connection`: Sent when a client connects
- `authentication`: Authentication status
- `message`: Broadcast message from another user
- `direct`: Private message from another user
- `user_list`: List of currently connected users
- `message_delivered`: Confirmation of message delivery
- `error`: Error messages

### From Client to Server

- `authenticate`: Authenticate with a JWT token
- `message`: Send a broadcast message
- `direct`: Send a direct message to a specific user

## Security Considerations

- Always use `wss://` in production
- Keep your JWT secret secure and never commit it to version control
- Implement rate limiting in production
- Validate and sanitize all user input
- Use proper CORS headers if serving the client from a different domain

## Environment Variables

| Variable    | Default     | Description                           |
|-------------|-------------|---------------------------------------|
| PORT        | 4000        | Port to run the server on             |
| HOST        | localhost   | Host to bind the server to            |
| JWT_SECRET  | (required)  | Secret key for JWT signing            |
| NODE_ENV    | development | Environment (development/production)  |

## License

MIT
