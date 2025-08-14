# Salahor Examples

This directory contains runnable examples that demonstrate how to use the Salahor library in various scenarios.

## Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher

## Getting Started

1. Install dependencies in the root directory:
   ```bash
   pnpm install
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Navigate to any example directory and follow its specific instructions.

## Example Categories

### 1. Core Concepts
- [Basic Stream](./core/basic-stream) - Simple event stream usage
- [Operators](./core/operators) - Common stream operators in action
- [Error Handling](./core/error-handling) - Handling errors in streams

### 2. Web Examples
- [Real-time Search](./web/real-time-search) - Search with debounce
- [Form Validation](./web/form-validation) - Reactive form validation
- [Drag and Drop](./web/drag-and-drop) - Drag and drop with streams

### 3. Network
- [WebSocket Chat](./network/websocket-chat) - Real-time chat application
- [API Polling](./network/api-polling) - Data polling with retry logic
- [SSE Example](./network/server-sent-events) - Server-Sent Events demo

### 4. State Management
- [Todo App](./state/todo-app) - Simple todo application
- [Counter](./state/counter) - Simple counter with state

### 5. Integration
- [React Integration](./integration/react) - Using Salahor with React
- [Vue Integration](./integration/vue) - Using Salahor with Vue
- [Node.js Server](./integration/node-server) - Server-side usage

## Running Examples

Each example includes its own `README.md` with specific instructions. Generally, you can run them using:

```bash
cd examples/<example-directory>
pnpm install
pnpm start
```

## Contributing

Feel free to add more examples by creating a new directory following the existing structure. Make sure to include:
- A clear README.md
- All necessary dependencies
- Clear instructions for running the example

## License

MIT
