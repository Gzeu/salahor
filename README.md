# Salahor

[![npm version](https://img.shields.io/npm/v/salahor.svg)](https://www.npmjs.com/package/salahor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/salahor)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/Gzeu/salahor/actions)

Salahor is a high-performance, zero-dependency library that provides universal connectors between Events, EventTargets, and AsyncIterables. Optimized for both Node.js (v18+) and modern browsers, it's perfect for building reactive applications with minimal overhead.

## 🚀 Features

- **Universal Connectors**: Seamlessly connect between different async patterns
- **Cross-Platform**: Works in both browser and Node.js environments
- **High Performance**: Optimized for maximum throughput and minimal overhead
- **TypeScript First**: Built with TypeScript for excellent type safety
- **Zero Dependencies**: Lightweight and dependency-free
- **Worker Pool**: Efficiently manage CPU-intensive tasks with worker threads
- **Stream Adapters**: Work with Node.js streams and web streams

## 📦 Installation

```bash
# Using npm
npm install salahor

# Using yarn
yarn add salahor

# Using pnpm
pnpm add salahor
```

## 🛠️ Usage

### Basic Example

```typescript
import { fromEvent, map, filter } from 'salahor';

// Create a stream from DOM events
const click$ = fromEvent(document, 'click');

// Process the stream
const result$ = click$.pipe(
  map(event => ({
    x: event.clientX,
    y: event.clientY,
    timestamp: Date.now()
  })),
  filter(coord => coord.x % 2 === 0) // Only even x-coordinates
);

// Subscribe to the stream
result$.subscribe(coord => {
  console.log('Clicked at:', coord);
});
```

### Worker Pool Example

```typescript
import { WorkerPool } from 'salahor/worker';

// Create a worker pool with 4 workers
const pool = new WorkerPool({
  size: 4,
  workerPath: './worker.js'
});

// Process tasks in parallel
const results = await Promise.all(
  Array(10).fill(0).map((_, i) => 
    pool.run({ task: 'processData', data: i })
  )
);

console.log('Results:', results);
```

## 📚 Documentation

For detailed documentation, API reference, and more examples, please visit our [documentation website](https://gzeu.github.io/salahor/).

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by the Salahor team
- Inspired by RxJS, xstream, and other reactive programming libraries

## 🚀 Installation

Install the package using your favorite package manager:

```bash
# Using npm
npm install salahor

# Using yarn
yarn add salahor

# Using pnpm
pnpm add salahor

# Using bun
bun add salahor
```

### Requirements
- Node.js 18.0.0 or higher
- Modern browser with ES2020 support
- TypeScript 4.5+ (for TypeScript users)

## 🚀 Quick Start

### Basic Usage: Event Stream Processing

```javascript
import { fromEventTarget, map, filter, debounceTime } from 'salahor';

// Create a stream of button clicks
const button = document.querySelector('button');
const clickStream = fromEventTarget(button, 'click');

// Transform the stream
const processedClicks = clickStream.pipe(
  debounceTime(300),  // Debounce rapid clicks
  filter(event => event.clientX > 100),  // Only right side clicks
  map(event => ({
    x: event.clientX,
    y: event.clientY,
    timestamp: Date.now()
  }))
);

// Consume the stream
for await (const click of processedClicks) {
  console.log('Processed click:', click);
}
```

### Advanced: Worker Pool for CPU-Intensive Tasks

```javascript
import { createWorkerPool } from 'salahor/workers';

// Create a worker pool with 4 workers
const pool = createWorkerPool({
  minWorkers: 2,
  maxWorkers: 4,
  workerOptions: {
    // Worker initialization options
  }
});

// Define a CPU-intensive task
function processImage(imageData) {
  // Heavy image processing logic
  return performTransformations(imageData);
}

// Process multiple images in parallel
const images = [/* array of image data */];
const results = await Promise.all(
  images.map(img => pool.run(processImage, img))
);

// Clean up when done
await pool.terminate();
```

### Real-time Data Processing Pipeline

```javascript
import { fromEventTarget, pipe, map, filter, bufferTime } from 'salahor';

// Create a processing pipeline
const processSensorData = pipe(
  filter(data => data.value > 0),  // Filter valid readings
  map(data => ({
    ...data,
    timestamp: new Date().toISOString(),
    value: Math.round(data.value * 100) / 100  // Round to 2 decimal places
  })),
  bufferTime(1000),  // Buffer events for 1 second
  filter(events => events.length > 0)  // Only emit non-empty buffers
);

// Connect to a sensor
const sensor = connectToSensor();
const sensorStream = fromEventTarget(sensor, 'data');

// Process the stream
for await (const batch of processSensorData(sensorStream)) {
  console.log('Processed batch:', batch);
  await saveToDatabase(batch);
}
```

## 🧠 Core Concepts

### Event Streams

Salahor is built around the concept of **event streams** - sequences of asynchronous events that can be processed, transformed, and combined. These streams are represented as AsyncIterables, making them compatible with JavaScript's native async iteration protocols.

### Sources

Create async iterables from various event sources:

- `fromEventTarget(target, eventName, options)` - Create a stream from DOM EventTarget
  ```javascript
  import { fromEventTarget } from 'salahor';
  const clicks = fromEventTarget(button, 'click');
  ```

- `fromEventEmitter(emitter, eventName, options)` - Create a stream from Node.js EventEmitter
  ```javascript
  import { EventEmitter } from 'events';
  import { fromEventEmitter } from 'salahor';
  
  const emitter = new EventEmitter();
  const messages = fromEventEmitter(emitter, 'message');
  ```

- `fromPromise(promise, options)` - Create a stream from a Promise
  ```javascript
  const dataStream = fromPromise(fetchData());
  ```

- `fromInterval(ms, options)` - Create a stream that emits at fixed intervals
  ```javascript
  const ticks = fromInterval(1000); // Emit every second
  ```

- `fromIterable(iterable)` - Convert any sync or async iterable to a standard stream
  ```javascript
  const numberStream = fromIterable([1, 2, 3, 4, 5]);
  ```

### Operators

Operators transform or combine streams. All operators are pure functions that return new streams without modifying the original.

#### Transformation Operators

- `map(iterable, fn)` - Transform each value
  ```javascript
  const doubled = map(numbers, n => n * 2);
  ```

- `filter(iterable, predicate)` - Keep only values that pass the test
  ```javascript
  const evens = filter(numbers, n => n % 2 === 0);
  ```

- `take(iterable, count)` - Take the first N values
  ```javascript
  const firstFive = take(stream, 5);
  ```

- `buffer(iterable, size)` - Collect values into arrays of specified size
  ```javascript
  const batches = buffer(stream, 10); // Groups into arrays of 10
  ```

#### Timing Operators

- `debounceTime(iterable, ms)` - Only emit after specified quiet period
  ```javascript
  const debounced = debounceTime(inputEvents, 300);
  ```

- `throttleTime(iterable, ms)` - Limit emission rate
  ```javascript
  const throttled = throttleTime(mouseMoves, 100);
  ```

#### Combination Operators

- `merge(...iterables)` - Merge multiple streams
  ```javascript
  const combined = merge(stream1, stream2, stream3);
  ```

- `zip(...iterables)` - Combine values from multiple streams
  ```javascript
  const zipped = zip(stream1, stream2); // Yields [value1, value2]
  ```

- `concat(...iterables)` - Concatenate streams in sequence
  ```javascript
  const result = concat(stream1, stream2); // Stream2 starts after stream1 completes
  ```

- `race(...iterables)` - Emit values from the first stream to emit
  ```javascript
  const winner = race(request1, request2); // First to respond wins
  ```

### Worker System

Salahor provides a powerful worker system for CPU-intensive tasks:

- **Worker Pool**: Manage a pool of worker threads
- **RPC Support**: Simple remote procedure calls
- **Automatic Serialization**: Automatic serialization of functions and data

```javascript
import { createWorkerPool } from 'salahor/workers';

const pool = createWorkerPool({
  minWorkers: 2,
  maxWorkers: 4
});

// Run a function in the worker pool
const result = await pool.run(heavyComputation, data);
```

## 📚 API Reference

### Core Functions

#### `createAsyncQueue(options)`
Create a low-level async queue for custom stream implementations.

**Options:**
- `concurrency`: Maximum concurrent operations (default: 1)
- `autoStart`: Start processing immediately (default: true)
- `highWaterMark`: Maximum queue size before backpressure is applied

#### `withQueue(iterable, options)`
Add queueing behavior to any async iterable.

```javascript
const queuedStream = withClickStream(clickStream, {
  concurrency: 3,
  highWaterMark: 10
});
```

### Worker System

#### `createWorkerPool(options)`
Create a pool of worker threads.

**Options:**
- `minWorkers`: Minimum number of workers to keep alive
- `maxWorkers`: Maximum number of workers to create
- `idleTimeout`: Time in ms before idle workers are terminated
- `workerOptions`: Options passed to the Worker constructor

#### `runInWorker(fn, ...args)`
Run a function in a worker thread.

```javascript
const result = await runInWorker(heavyTask, arg1, arg2);
```

#### `workerize(fn)`
Create a workerized version of a function.

```javascript
const workerizedFn = workerize(expensiveCalculation);
const result = await workerizedFn(data);
```

## 🏗 Architecture

Salahor is built with these core principles:

1. **Modularity**: Each component is independent and can be used separately
2. **Performance**: Optimized for high throughput and low memory usage
3. **Compatibility**: Works across Node.js and browsers with the same API
4. **Extensibility**: Easy to add new operators and sources

### Core Components

- **Stream Core**: Base implementation of async iterable streams
- **Operators**: Pure functions for transforming streams
- **Sources**: Functions to create streams from various sources
- **Worker System**: For CPU-intensive tasks
- **Utilities**: Helper functions and types

## 🧪 Testing

Salahor includes a comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run performance benchmarks
npm run benchmark
```

## 📦 Browser Support

Salahor works in all modern browsers that support:
- Async Iteration
- Web Workers
- ES2020 features

For older browsers, you'll need to include appropriate polyfills.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## 📄 License

MIT © [Your Name]

---

<p align="center">
  Made with ❤️ by Your Name
</p>

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

## Worker Pool

The Worker Pool provides an efficient way to manage and distribute CPU-intensive tasks across multiple worker threads, with automatic scaling and load balancing.

### Features

- 🚀 **Automatic Scaling** - Dynamically adjusts the number of workers based on workload
- ⚖️ **Load Balancing** - Evenly distributes tasks across available workers
- ⏱️ **Idle Timeout** - Automatically removes idle workers to free up resources
- 🛡️ **Error Handling** - Robust error handling and worker recovery
- 📊 **Monitoring** - Track worker statistics and queue status
- 🌐 **Cross-Platform** - Works in both Node.js and browser environments

### Basic Usage

```javascript
import { WorkerPool } from 'salahor/workers/WorkerPool';

// Define a worker function
function workerFunction() {
  self.onmessage = async function(e) {
    const { type, data } = e.data;
    
    if (type === 'task') {
      // Process the task
      const result = processData(data);
      
      // Send the result back
      self.postMessage({ 
        type: 'result', 
        result 
      });
    }
  };
  
  function processData(data) {
    // CPU-intensive work here
    let result = 0;
    for (let i = 0; i < data.iterations; i++) {
      result += Math.sqrt(i) * Math.random();
    }
    return { result, processedAt: new Date().toISOString() };
  }
}

// Create a worker pool
const pool = new WorkerPool(workerFunction, {
  minWorkers: 2,
  maxWorkers: 4,
  idleTimeout: 5000, // 5 seconds
});

// Execute tasks
async function processTasks() {
  try {
    const results = await Promise.all([
      pool.execute({ iterations: 1000000 }),
      pool.execute({ iterations: 2000000 }),
      pool.execute({ iterations: 1500000 }),
    ]);
    
    console.log('Results:', results);
  } finally {
    // Clean up
    await pool.terminate();
  }
}

processTasks().catch(console.error);
```

### Advanced Features

#### Task Queue Management

```javascript
// Get current worker statistics
const stats = pool.getWorkerStats();
console.log('Worker stats:', stats);
// {
//   total: 2,      // Total number of workers
//   idle: 1,       // Number of idle workers
//   busy: 1,       // Number of busy workers
//   queueSize: 0   // Number of tasks in queue
// }
```

#### Error Handling

```javascript
// Listen for worker errors
pool.on('error', ({ worker, error }) => {
  console.error('Worker error:', error);  
});

// Listen for worker creation/termination
pool.on('worker:created', ({ worker, totalWorkers }) => {
  console.log(`New worker created. Total: ${totalWorkers}`);
});

pool.on('worker:exited', ({ worker, code, totalWorkers }) => {
  console.log(`Worker exited with code ${code}. Total: ${totalWorkers}`);
});
```

#### Transferable Objects (Browser)

```javascript
// In browser, you can transfer large data efficiently
const largeBuffer = new ArrayBuffer(1024 * 1024 * 100); // 100MB

// The worker will receive the buffer directly without copying
await pool.execute(
  { type: 'process-buffer', buffer: largeBuffer },
  [largeBuffer] // List of transferable objects
);
```

### Example: Image Processing

```javascript
async function processImages(images) {
  const pool = new WorkerPool(processImage, {
    minWorkers: 2,
    maxWorkers: navigator.hardwareConcurrency || 4,
  });

  try {
    // Process all images in parallel
    const processed = await Promise.all(
      images.map(image => pool.execute(image))
    );
    return processed;
  } finally {
    await pool.terminate();
  }
}

// Worker function for image processing
function processImage() {
  self.onmessage = async function(e) {
    const { data } = e.data;
    const result = await applyImageFilters(data);
    self.postMessage({ result });
  };
  
  function applyImageFilters(imageData) {
    // Image processing logic here
    // ...
    return processedImageData;
  }
}
```

## Workerize Utility

The `workerize` utility makes it incredibly easy to convert any function into a worker-based function, automatically handling all the worker creation, message passing, and cleanup.

### Features

- 🎯 **Automatic Workerization** - Convert any function to run in a worker with one call
- 🔄 **Seamless API** - Call workerized functions just like regular functions
- ⚡ **Worker Pooling** - Automatic management of worker pool with configurable size
- 🧹 **Automatic Cleanup** - Proper resource cleanup when workers are no longer needed
- 🌐 **Cross-Platform** - Works in both Node.js and browser environments

### Basic Usage

```javascript
import { workerize } from 'salahor/workers/workerize';

// Define a CPU-intensive function
function calculatePrimes(limit) {
  const primes = [];
  for (let i = 2; i <= limit; i++) {
    let isPrime = true;
    for (let j = 2, max = Math.sqrt(i); j <= max; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(i);
  }
  return { count: primes.length, primes: primes.slice(0, 10) };
}

// Workerize the function
const calculatePrimesWorkerized = workerize(calculatePrimes);

// Use it like a regular function (but it runs in a worker!)
async function main() {
  try {
    const result = await calculatePrimesWorkerized(1000000);
    console.log(`Found ${result.count} prime numbers`);
    console.log('First 10 primes:', result.primes);
  } finally {
    // Clean up worker resources when done
    await terminateWorkerizedFunctions();
  }
}

main().catch(console.error);
```

### Advanced Usage

#### Worker Pool Configuration

```javascript
import { workerize } from 'salahor/workers/workerize';

// Configure worker pool size and options
const processData = workerize(heavyComputation, {
  minWorkers: 2,     // Keep at least 2 workers ready
  maxWorkers: 4,     // Create up to 4 workers if needed
  idleTimeout: 30000 // Terminate idle workers after 30 seconds
});

// Process multiple items in parallel
const results = await Promise.all([
  processData(data1),
  processData(data2),
  processData(data3)
]);
```

#### Transferable Objects (Browser)

```javascript
// For large data, use transferable objects for zero-copy transfer
const processImage = workerize((imageData) => {
  // Process image data (runs in worker)
  const processed = new Uint8ClampedArray(imageData.length);
  // ... image processing logic ...
  return processed;
});

// In main thread
const imageData = new Uint8ClampedArray(1024 * 1024 * 4); // 4MB image
const processed = await processImage(imageData, [imageData.buffer]);
```

## Worker RPC

The Worker RPC utility provides a clean, type-safe way to expose methods to worker threads with a familiar function call interface, complete with error handling and support for transferable objects.

### Features

- 🎯 **Type-Safe RPC** - Call worker methods with proper TypeScript support
- 🔄 **Nested Methods** - Organize methods in namespaces (e.g., `rpc.math.add`)
- ⏱️ **Timeouts** - Configurable timeouts for RPC calls
- 🛡️ **Error Handling** - Proper error propagation from worker to main thread
- 📦 **Transferable Support** - Efficiently transfer large data structures
- 🔌 **Automatic Cleanup** - Proper resource management

### Basic Usage

```javascript
import { createWorkerRPC, createRPCHandler } from 'salahor/workers/workerRPC';

// 1. Define your API
const api = {
  add: (a, b) => a + b,
  math: {
    multiply: (a, b) => a * b,
    random: (min, max) => Math.random() * (max - min) + min
  }
};

// 2. Create an RPC worker
const workerScript = createRPCHandler(api);
const rpc = createWorkerRPC(workerScript);

// 3. Call methods on the worker
async function main() {
  console.log('2 + 3 =', await rpc.add(2, 3));
  console.log('6 * 7 =', await rpc.math.multiply(6, 7));
  console.log('Random number:', await rpc.math.random(1, 100));
  
  // Clean up
  await rpc.terminate();
}

main().catch(console.error);
```

### Advanced Features

#### Error Handling

```javascript
try {
  await rpc.someMethod();
} catch (error) {
  console.error('RPC call failed:', error);
}
```

#### Transferable Objects

```javascript
// In browser - efficiently transfer large data
const largeBuffer = new Uint8Array(1024 * 1024 * 100); // 100MB
const result = await rpc.processData(largeBuffer.buffer, [largeBuffer.buffer]);
```

#### Timeouts

```javascript
// Set a 5 second timeout for all RPC calls
const rpc = createWorkerRPC(workerScript, {
  timeout: 5000 // 5 seconds
});

try {
  // This will throw if it takes longer than 5 seconds
  await rpc.slowOperation();
} catch (error) {
  console.error(error.message); // "RPC call to slowOperation timed out after 5000ms"
}
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by RxJS, IxJS, and other reactive programming libraries
- Built with ❤️ by the Salahor team
