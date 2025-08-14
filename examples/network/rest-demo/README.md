# REST API Demo

This is a simple yet powerful REST API demo built with Node.js and Express. It provides a complete CRUD (Create, Read, Update, Delete) interface for managing todo items.

## Features

- **RESTful API** - Follows REST conventions
- **CORS Support** - Works with frontend applications
- **In-Memory Storage** - Simple data persistence (resets on server restart)
- **JSON API** - All requests and responses are in JSON format
- **Error Handling** - Proper HTTP status codes and error messages

## Prerequisites

- Node.js 18+
- npm or pnpm

## Installation

1. Navigate to the project directory:
   ```bash
   cd examples/network/rest-demo
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

## Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3002` by default.

## API Endpoints

### Get All Todos

```http
GET /api/todos
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Learn REST API",
    "completed": false
  },
  {
    "id": 2,
    "title": "Build a demo",
    "completed": false
  }
]
```

### Get Single Todo

```http
GET /api/todos/1
```

**Response:**
```json
{
  "id": 1,
  "title": "Learn REST API",
  "completed": false
}
```

### Create New Todo

```http
POST /api/todos
Content-Type: application/json

{
  "title": "New Todo",
  "completed": false
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "title": "New Todo",
  "completed": false
}
```

### Update Todo

```http
PUT /api/todos/1
Content-Type: application/json

{
  "title": "Updated Todo",
  "completed": true
}
```

**Response:**
```json
{
  "id": 1,
  "title": "Updated Todo",
  "completed": true
}
```

### Delete Todo

```http
DELETE /api/todos/1
```

**Response:**
```
204 No Content
```

## Web Interface

Access the web interface at `http://localhost:3002` to interact with the API through a simple UI.

## Testing with cURL

Here are some example cURL commands to test the API:

```bash
# Get all todos
curl http://localhost:3002/api/todos

# Get a single todo
curl http://localhost:3002/api/todos/1

# Create a new todo
curl -X POST -H "Content-Type: application/json" -d '{"title":"New Todo"}' http://localhost:3002/api/todos

# Update a todo
curl -X PUT -H "Content-Type: application/json" -d '{"title":"Updated Todo","completed":true}' http://localhost:3002/api/todos/1

# Delete a todo
curl -X DELETE http://localhost:3002/api/todos/1
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Example error response:
```json
{
  "message": "Todo not found"
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
