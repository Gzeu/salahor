# Basic Stream Example

This example demonstrates the fundamental concepts of using Salahor's event streams in a simple counter application.

## What it demonstrates

- Creating and using event streams
- Subscribing to stream events
- Handling different types of events (increment, decrement, reset)
- Updating the UI reactively

## How to run

1. Ensure you have built the Salahor packages:
   ```bash
   cd ../../..
   pnpm build
   ```

2. Open the example in a web browser. You can use a simple HTTP server like `http-server` or `serve`:
   ```bash
   # If you have http-server installed globally
   npx http-server . -p 3000
   ```
   Then open http://localhost:3000 in your browser.

3. Interact with the buttons to see the counter update and log events.

## Code Overview

The example creates three event streams:
- `increment$`: Fires when the increment button is clicked
- `decrement$`: Fires when the decrement button is clicked
- `reset$`: Fires when the reset button is clicked

Each stream is subscribed to, and the UI updates reactively based on the events received.

## Key Concepts

- **EventStream**: A stream of events that can be subscribed to
- **Subscription**: The act of listening to events from a stream
- **Next**: The method to emit a new value to the stream
- **Observer**: An object that handles the stream's notifications (next, error, complete)

## Next Steps

- Try adding a new button that increments by 5
- Add a button that toggles between incrementing and decrementing
- Implement a maximum and minimum value limit
