## Advanced Usage

### withQueue - Backpressure Management

The `withQueue` utility provides configurable backpressure handling for any async iterable:

```javascript
import { withQueue } from 'uniconnect';

// Create a queue with a limit of 100 items
const queue = withQueue({ queueLimit: 100, onOverflow: 'drop-old' });

// Wrap any async iterable with the queue
const slowConsumer = queue(fastProducer);

// Process items with backpressure handling
for await (const item of slowConsumer) {
  // Process item
}
```

#### Queue Overflow Policies

- `'drop-old'`: Discard the oldest item when the queue is full
- `'drop-new'`: Discard new items when the queue is full
- `'throw'`: Throw a `QueueOverflowError` when the queue is full

### Debounce and Throttle Examples

Debounce rapid events:

```js
import { fromEventEmitter, debounceTime, pipe } from 'uniconnect';
const it = pipe(fromEventEmitter(emitter, 'data'), debounceTime(200));
for await (const v of it) console.log(v);
```

Throttle with trailing:

```js
import { fromEventEmitter, throttleTime, pipe } from 'uniconnect';
const it = pipe(fromEventEmitter(emitter, 'data'), throttleTime(500, { leading: true, trailing: true }));
for await (const v of it) console.log(v);
```

Merge two streams:

```js
import { merge, take } from 'uniconnect';
for await (const v of take(merge(streamA, streamB), 5)) console.log(v);
```

Zip two streams:

```js
import { zip, take } from 'uniconnect';
for await (const pair of take(zip(streamA, streamB), 3)) console.log(pair);
```

Accumulate with scan:

```js
import { scan, pipe } from 'uniconnect';
const sums = pipe(numbers, scan((acc, x) => acc + x, 0));
for await (const s of sums) console.log(s);
```
# uniconnect

Zero-dependency universal connectors between Events, EventTargets and AsyncIterables with lightweight operators. Node 18+.
![npm version](https://img.shields.io/npm/v/uniconnect?color=%2300a) ![node version](https://img.shields.io/badge/node-%3E%3D18-3c873a) ![license](https://img.shields.io/badge/license-MIT-blue) ![minzipped size](https://img.shields.io/bundlephobia/minzip/uniconnect) ![test coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

Universal, zero-dependency building blocks to connect Node/EventTarget event sources with modern AsyncIterables and compose them via tiny operators.

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Abort & Error Handling](#abort--error-handling)
- [Compatibility Notes](#compatibility-notes)
- [Contributing](#contributing)
- [License](#license)

## Features
- 🚀 **Minimal & Fast**: Zero dependencies, ESM-first, optimized for performance
- 🔄 **Universal Connectivity**: Seamlessly connect `EventEmitter`, `EventTarget`, and `AsyncIterable`
- 🧩 **Powerful Operators**: Compose with `pipe()` and operators: `map`, `filter`, `take`, `buffer`, `merge`, `zip`, etc.
- 🛡️ **Robust Error Handling**: Comprehensive error types and cleanup
- 🎯 **Backpressure Control**: Built-in queue management with configurable overflow policies
- ⚡ **Abort Support**: First-class `AbortSignal` integration
- 🧠 **Memory Efficient**: Automatic cleanup of resources

## Requirements
- Node.js 18+

## Quick Start

```js
import { fromEventEmitter, pipe, take } from 'uniconnect';
import { EventEmitter } from 'node:events';

const ee = new EventEmitter();
const iterable = pipe(fromEventEmitter(ee, 'data'), take(3));

(async () => {
  ee.emit('data', 'a');
  ee.emit('data', 'b');
  ee.emit('data', 'c');
})();

for await (const v of iterable) console.log(v);
```

## Install
```sh
npm install uniconnect
```

## 🚀 Getting Started

### Installation
```sh
npm install uniconnect
# or
yarn add uniconnect
# or
pnpm add uniconnect
```

## Usage

### From EventEmitter to AsyncIterable

```js
import { fromEventEmitter, take, pipe } from 'uniconnect';
import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();

async function main() {
  const it = pipe(
    fromEventEmitter(emitter, 'data'),
    take(3),
  );

  (async () => {
    emitter.emit('data', 1);
    emitter.emit('data', 2);
    emitter.emit('data', 3);
    emitter.emit('data', 4);
  })();

  for await (const v of it) {
    console.log('got', v);
  }
}

main();
```

### From EventTarget to AsyncIterable

```js
import { fromEventTarget } from 'uniconnect';
const ac = new AbortController();
const { signal } = ac;

const target = new EventTarget();
const iterable = fromEventTarget(target, 'ping', { signal });

(async () => {
  target.dispatchEvent(new Event('ping'));
  ac.abort();
})();

for await (const ev of iterable) {
  console.log('event', ev.type);
}
```

### Operators

```js
import { pipe, map, filter, buffer } from 'uniconnect';

const processed = pipe(
  sourceIterable,
  map(x => x * 2),
  filter(x => x % 3 === 0),
  buffer(5),
);

for await (const chunk of processed) {
  // chunks of size 5
}
```

### Retry

```js
import { retryIterable } from 'uniconnect';

const src = () => someFlakyAsyncIterable();
for await (const v of retryIterable(src, { attempts: 5, delay: 200 })) {
  // values...
}
```

## 📚 API Reference

### Core Functions

#### `fromEventTarget(target, eventName, options?)`
Connects any `EventTarget` to an `AsyncIterable`.

```typescript
function fromEventTarget(
  target: EventTarget,
  eventName: string,
  options?: {
    signal?: AbortSignal;
    queueLimit?: number;
    onOverflow?: 'drop-old' | 'drop-new' | 'throw';
  }
): AsyncIterable<Event>;
```

#### `fromEventEmitter(emitter, eventName, options?)`
Connects Node.js `EventEmitter` to an `AsyncIterable`.

```typescript
function fromEventEmitter(
  emitter: EventEmitter,
  eventName: string,
  options?: {
    signal?: AbortSignal;
    queueLimit?: number;
    onOverflow?: 'drop-old' | 'drop-new' | 'throw';
  }
): AsyncIterable<any>;
```

#### `toEventEmitter(asyncIterable, emitter, eventName)`
Consumes an `AsyncIterable` and emits values as events.

```typescript
function toEventEmitter<T>(
  asyncIterable: AsyncIterable<T>,
  emitter: EventEmitter,
  eventName: string
): Promise<void>;
```

### Queue Management

#### `withQueue(asyncIterable, options?)`
Adds backpressure control to any async iterable.

```typescript
function withQueue<T>(
  source: AsyncIterable<T>,
  options?: {
    signal?: AbortSignal;
    queueLimit?: number;
    onOverflow?: 'drop-old' | 'drop-new' | 'throw';
  }
): AsyncIterable<T>;
```

### Operators

#### `pipe(iterable, ...operators)`
Chains multiple operators together.

```typescript
function pipe<T>(
  source: AsyncIterable<T>,
  ...operators: Array<(source: AsyncIterable<any>) => AsyncIterable<any>>
): AsyncIterable<any>;
```

#### Available Operators

- `map<T, R>(fn: (value: T) => R | Promise<R>)`
- `filter<T>(predicate: (value: T) => boolean | Promise<boolean>)`
- `take<T>(count: number)`
- `buffer<T>(size: number)`
- `scan<T, R>(reducer: (acc: R, value: T) => R | Promise<R>, seed: R)`
- `distinctUntilChanged<T>(equals?: (a: T, b: T) => boolean)`
- `debounceTime<T>(ms: number)`
- `throttleTime<T>(ms: number, options?: { leading?: boolean; trailing?: boolean })`
- `timeout<T>(ms: number, options?: { error?: Error })`
- `merge<T>(...sources: AsyncIterable<T>[])`
- `zip<T extends any[]>(...sources: { [K in keyof T]: AsyncIterable<T[K]> })`

## 🔄 Error Handling

uniconnect provides specific error types for better error handling:

```typescript
class UniconnectError extends Error {
  code: string;
}

class AbortError extends UniconnectError {}
class QueueOverflowError extends UniconnectError {}
class ValidationError extends UniconnectError {}
class NotSupportedError extends UniconnectError {}
```

### Error Handling Example

```typescript
try {
  const iterable = fromEventEmitter(emitter, 'data', { queueLimit: 10 });
  for await (const value of iterable) {
    // Process values
  }
} catch (error) {
  if (error instanceof QueueOverflowError) {
    console.error('Queue overflow occurred!');
  } else if (error instanceof AbortError) {
    console.log('Operation was aborted');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 🚀 Advanced Usage

### Backpressure Management

```typescript
import { fromEventEmitter, withQueue, pipe, map } from 'uniconnect';

// Process events with backpressure control
const iterable = pipe(
  fromEventEmitter(emitter, 'data'),
  withQueue({
    queueLimit: 100,
    onOverflow: 'drop-old', // Drop oldest events when queue is full
  }),
  map(processData)
);
```

### Composing Multiple Sources

```typescript
import { merge, zip, pipe, map, filter } from 'uniconnect';

// Merge multiple event sources
const combined = merge(
  fromEventEmitter(source1, 'data'),
  fromEventEmitter(source2, 'data')
);

// Process in parallel with zip
const processed = pipe(
  zip(sourceA, sourceB),
  map(([a, b]) => a + b),
  filter(x => x > 0)
);
```

## 📦 Package Size

- Minified: ~2.5 KB
- Minified + Gzipped: ~1 KB

## 🔧 Development

```sh
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [Your Name]

- `fromEventTarget(target, eventName, { signal, queueLimit, onOverflow }) -> AsyncIterable`
  - Connects any `EventTarget` (e.g. DOM/EventTarget polyfills) to an `AsyncIterable`.
  - Params: `target: EventTarget`, `eventName: string`, `options?: { signal?: AbortSignal, queueLimit?: number, onOverflow?: 'drop-old'|'drop-new'|'throw' }`
  - Returns: `AsyncIterable<Event>`

- `fromEventEmitter(emitter, eventName, { signal, queueLimit, onOverflow }) -> AsyncIterable`
  - Connects Node.js `EventEmitter` to an `AsyncIterable`.
  - Params: `emitter: EventEmitter`, `eventName: string`, `options?: { signal?: AbortSignal, queueLimit?: number, onOverflow?: 'drop-old'|'drop-new'|'throw' }`
  - Returns: `AsyncIterable<any>`

- `toEventEmitter(asyncIterable, emitter, eventName) -> Promise<void>`
  - Consumes an `AsyncIterable` and re-emits values as events on the target emitter.

- `toAsyncIterable(source, eventName, options)`
  - Shortcut: detects the source type and calls `fromEventTarget` or `fromEventEmitter` accordingly.

### Queue overflow control

Use `queueLimit` to cap buffered events when consumer is slower than producer. Choose `onOverflow` strategy:

- `drop-old`: remove oldest item to make room for new one (keep latest data).
- `drop-new`: ignore the new item (preserve earliest data).
- `throw`: fail the stream with `Error('Queue overflow')`.

Example:

```js
const it = fromEventEmitter(emitter, 'data', { queueLimit: 1000, onOverflow: 'drop-old' });
```

- `pipe(iterable, ...ops) -> AsyncIterable`
  - Chain composition helper for async operators.

- Operators
  - `map(fn)`, `filter(fn)`, `take(n)`, `buffer(n)`
  - `scan(reducer, seed?)`, `distinctUntilChanged(equals?)`
  - `debounceTime(ms)`, `throttleTime(ms, { leading, trailing })`

- Utilities
  - `retryIterable(factory, { attempts, delay })`, `timeout(ms, { error? })`

### Example: toEventEmitter

```js
import { toEventEmitter } from 'uniconnect';
import { EventEmitter } from 'node:events';

async function* src() { yield 1; yield 2; }
const ee = new EventEmitter();
ee.on('data', v => console.log('data', v));
await toEventEmitter(src(), ee, 'data');
```

## Abort & Error Handling
- You can cancel streams with an `AbortController` via `options.signal`.
- Sources that emit an `error` event will propagate the error to the iterator.
- On abort or error, listeners are automatically cleaned up.

```js
import { fromEventTarget } from 'uniconnect';
const ac = new AbortController();
const iterable = fromEventTarget(new EventTarget(), 'tick', { signal: ac.signal });
const it = iterable[Symbol.asyncIterator]();
ac.abort(); // iterator will close with AbortError
```

## Compatibility Notes
- `EventEmitter` supported via standard methods: `on/off` or `addListener/removeListener` and `emit`.
- `EventTarget` requires `addEventListener/removeEventListener`.
- ESM-only package. In CommonJS, use dynamic `import()` or configure transpilation.

## Contributing
- Issues and PRs are welcome. Please include a minimal test (Node's built-in `node:test`) for any new functionality.

## Testing
- This project uses Node's built-in test runner.
- Run all tests:

```sh
npm test
```

Test files live under `test/` and use the `.test.mjs` suffix.

## Versioning & Release
- Follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.
- Common flows:
  - Patch: `npm version patch`
  - Minor: `npm version minor`
  - Major: `npm version major`
- Publish to npm (public):

```sh
npm publish --access public
```

- Push tags and code to GitHub:

```sh
git push origin main --follow-tags
```

## License

MIT

## Changelog

See GitHub Releases for notable changes.
