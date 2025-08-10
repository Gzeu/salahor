# Salahor

[![npm version](https://img.shields.io/npm/v/salahor.svg)](https://www.npmjs.com/package/salahor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/salahor)](https://nodejs.org/)

Zero-dependency universal connectors between Events, EventTargets and AsyncIterables with lightweight operators. Node 18+.

## Features

- 🚀 **Zero Dependencies** - Lightweight and fast
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

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by RxJS, IxJS, and other reactive programming libraries
- Built with ❤️ by the Salahor team
