# Salahor

[![npm version](https://img.shields.io/npm/v/salahor.svg)](https://www.npmjs.com/package/salahor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/salahor)](https://nodejs.org/)
[![Browser Support](https://img.shields.io/badge/browser-support-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator)

Universal connectors between Events, EventTargets and AsyncIterables with lightweight operators. Works in both Node.js (v18+) and modern browsers.

## Features

- 🌐 **Web & Node.js** - Works seamlessly in both browser and Node.js environments
- 🚀 **Lightweight and Fast** - Minimal overhead for maximum performance
- 🔄 **Universal Connectors** - Bridge between Events, EventTargets, and AsyncIterables
- ⚡ **Lightweight Operators** - Functional operators for data transformation
- 🧵 **Worker Support** - Offload CPU-intensive tasks to worker threads
- 📦 **Modular** - Import only what you need
- 🛠 **TypeScript Ready** - Full type definitions included

## Installation

```bash
npm install salahor
# or
yarn add salahor
# or
pnpm add salahor
```

## Quick Start

### Basic Usage

```javascript
import { fromEventTarget, map, filter } from 'salahor';

// Create an async iterable from an EventTarget
const button = document.querySelector('button');
const clicks = fromEventTarget(button, 'click');

// Use operators to transform the stream
const filteredClicks = filter(clicks, (event) => event.clientX > 100);
const coordinates = map(filteredClicks, (event) => ({
  x: event.clientX,
  y: event.clientY,
}));

// Consume the async iterable
for await (const coord of coordinates) {
  console.log('Click at:', coord);
}
```

### Using with Workers

```javascript
import { runInWorker } from 'salahor/workers';

// CPU-intensive task
function processData(data) {
  // Some heavy computation
  return data.map(/* ... */);
}

// This will run in a worker thread if available
const result = await runInWorker(processData, largeDataSet);
```

## Core Concepts

### Sources

Create async iterables from various event sources:

- `fromEventTarget(target, eventName, options)` - From DOM EventTarget
- `fromEventEmitter(emitter, eventName, options)` - From Node.js EventEmitter
- `fromPromise(promise)` - From a Promise that resolves to an array
- `fromInterval(ms, options)` - Emit values at a fixed interval
- `fromIterable(iterable)` - Convert any iterable to an async iterable

### Operators

Transform and combine async iterables:

- `map(iterable, fn)` - Transform each value
- `filter(iterable, predicate)` - Keep only values that pass the test
- `take(iterable, count)` - Take the first N values
- `buffer(iterable, size)` - Collect values into arrays of specified size
- `debounceTime(iterable, ms)` - Only emit after a specified duration has passed
- `throttleTime(iterable, ms)` - Limit the rate of emitted values
- `merge(...iterables)` - Merge multiple iterables
- `zip(...iterables)` - Combine values from multiple iterables
- `concat(...iterables)` - Concatenate multiple iterables
- `race(...iterables)` - Emit values from the first iterable to emit

### Core Utilities

- `createAsyncQueue(options)` - Low-level async queue implementation
- `withQueue(iterable, options)` - Add queueing behavior to any async iterable
- `toEventEmitter(iterable, emitter, eventName)` - Convert an async iterable to an EventEmitter
- `toAsyncIterable(source, eventName, options)` - Convert various sources to async iterable

## API Reference

For detailed API documentation, see the [API Reference](./API.md).

## Examples

### Real-time Search with Debounce

```javascript
import { fromEventTarget, debounceTime, map } from 'salahor';

const searchInput = document.querySelector('#search');
const searchResults = document.querySelector('#results');

// Create stream of search input events
const searchStream = fromEventTarget(searchInput, 'input')
  .pipe(
    map(e => e.target.value.trim()),
    filter(query => query.length > 2),
    debounceTime(300),
    map(async query => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      return response.json();
    })
  );

// Display results
for await (const results of searchStream) {
  searchResults.innerHTML = results
    .map(result => `<div>${result.title}</div>`)
    .join('');
}
```

### Worker-based Image Processing

```javascript
import { runInWorker } from 'salahor/workers';

function processImage(imageData) {
  // Heavy image processing
  const processed = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < processed.length; i += 4) {
    // Convert to grayscale
    const avg = (processed[i] + processed[i + 1] + processed[i + 2]) / 3;
    processed[i] = avg;     // R
    processed[i + 1] = avg; // G
    processed[i + 2] = avg; // B
  }
  return processed;
}

// Process image in a worker
const processedImage = await runInWorker(processImage, imageData);
```

## MQTT Connector

The MQTT connector provides a simple and efficient way to work with MQTT messaging in both Node.js and browser environments.

### Features

- 📡 **Cross-Platform** - Works in both Node.js and modern browsers
- 🔄 **Async Iterable Interface** - Use familiar `for await...of` syntax
- 🛠 **TypeScript Support** - Full type definitions included
- 🔌 **Automatic Reconnection** - Built-in reconnection handling
- 🧹 **Resource Management** - Proper cleanup of subscriptions and connections

### Installation

```bash
npm install mqtt
# or
yarn add mqtt
```

> **Note**: The MQTT connector requires the `mqtt` package as a peer dependency for Node.js environments.

### Usage

#### Basic Example

```javascript
import { createMqttClient } from 'salahor/connectors/mqtt';

async function main() {
  // Create an MQTT client
  const client = await createMqttClient({
    url: 'ws://test.mosquitto.org:8080',
    mqttOptions: {
      clientId: `client-${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 1000
    }
  });

  try {
    // Subscribe to a topic
    const subscription = await client.subscribe('salahor/test/topic');
    
    // Handle incoming messages
    (async () => {
      for await (const message of subscription) {
        console.log('Received message:', message);
        // message format: { topic: string, message: string }
      }
    })();

    // Publish a message
    await client.publish('salahor/test/topic', JSON.stringify({
      value: 'Hello, MQTT!',
      timestamp: Date.now()
    }));

    // Keep the connection alive for a while
    await new Promise(resolve => setTimeout(resolve, 5000));
  } finally {
    // Clean up
    await client.close();
  }
}

main().catch(console.error);
```

#### Browser Example

The same code works in the browser, but you'll need to use a WebSocket MQTT broker:

```javascript
import { createMqttClient } from 'salahor/connectors/mqtt';

async function setupMqtt() {
  const client = await createMqttClient({
    url: 'ws://test.mosquitto.org:8080',
    mqttOptions: {
      clientId: `browser-${Math.random().toString(16).substr(2, 8)}`
    }
  });

  // Subscribe to a topic
  const subscription = await client.subscribe('salahor/browser/test');
  
  // Handle incoming messages
  (async () => {
    for await (const { topic, message } of subscription) {
      const data = JSON.parse(message);
      console.log(`[${topic}]`, data);
    }
  })();

  // Publish a message when a button is clicked
  document.getElementById('publishBtn').addEventListener('click', async () => {
    await client.publish('salahor/browser/test', JSON.stringify({
      action: 'button_click',
      timestamp: Date.now()
    }));
  });

  // Clean up when the page is unloaded
  window.addEventListener('beforeunload', () => {
    client.close().catch(console.error);
  });
}

setupMqtt().catch(console.error);
```

### API Reference

#### `createMqttClient(options) -> Promise<MqttClient>`

Creates a new MQTT client.

**Parameters:**
- `options` (Object):
  - `url` (string): MQTT broker URL (e.g., 'mqtt://test.mosquitto.org' or 'ws://test.mosquitto.org:8080')
  - `mqttOptions` (Object): MQTT client options (see [MQTT.js documentation](https://github.com/mqttjs/MQTT.js#client))
  - `signal` (AbortSignal): Optional AbortSignal to close the connection

**Returns:**
- `Promise<MqttClient>`: A promise that resolves to an MQTT client instance

#### `MqttClient`

##### `subscribe(topic, options) -> AsyncIterable<{topic: string, message: string}>`

Subscribes to an MQTT topic.

**Parameters:**
- `topic` (string): Topic to subscribe to
- `options` (Object): Subscription options
  - `qos` (number): Quality of Service level (0, 1, or 2)

**Returns:**
- `AsyncIterable<{topic: string, message: string}>`: An async iterable of messages

##### `publish(topic, message, options) -> Promise<void>`

Publishes a message to an MQTT topic.

**Parameters:**
- `topic` (string): Topic to publish to
- `message` (string | Buffer): Message to publish
- `options` (Object): Publish options
  - `qos` (number): Quality of Service level (0, 1, or 2)
  - `retain` (boolean): Whether the message should be retained by the broker

**Returns:**
- `Promise<void>`: A promise that resolves when the message is published

##### `close() -> Promise<void>`

Closes the MQTT connection and cleans up resources.

**Returns:**
- `Promise<void>`: A promise that resolves when the connection is closed

### Error Handling

The MQTT client emits the following events:

- `error`: Emitted when an error occurs
- `close`: Emitted when the connection is closed

```javascript
client.on('error', (error) => {
  console.error('MQTT error:', error);
});

client.on('close', () => {
  console.log('MQTT connection closed');
});
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by RxJS, IxJS, and other reactive programming libraries
- Built with ❤️ by the Salahor team
