## Advanced Usage

### Worker Utilities

The worker utilities provide a robust way to offload CPU-intensive tasks to worker threads with automatic fallback to the main thread when workers aren't available. The implementation is zero-dependency and works in Node.js environments.

#### TypeScript Support

The package includes comprehensive TypeScript type definitions for all worker utilities, providing full type safety and IntelliSense support.

##### Core Types

```typescript
/**
 * Represents detailed information about worker support in the current environment.
 * @example
 * const support = getWorkerSupport();
 * if (!support.supported) {
 *   console.warn('Workers not supported:', support.message);
 * }
 */
type WorkerSupport = {
  /** Whether workers are supported in the current environment */
  supported: boolean;
  /** Node.js version string (e.g., '16.14.0') */
  version: string;
  /** Whether the worker_threads module is available */
  hasWorkerThreads: boolean;
  /** Whether running with --experimental-worker flag */
  isExperimental: boolean;
  /** Human-readable support status message */
  message: string;
  /** Version requirements information */
  requirements: {
    /** Minimum required Node.js version for basic worker support */
    minNodeVersion: string;  // e.g., '12.17.0'
    /** Recommended Node.js version for stable worker support */
    recommendedNodeVersion: string;  // e.g., '16.0.0'
  };
};

/**
 * Configuration options for worker threads.
 * These options are passed directly to Node.js Worker constructor.
 */
type WorkerOptions = {
  /**
   * Environment variables to be made available in the worker thread.
   * @default process.env
   */
  env?: NodeJS.ProcessEnv;
  
  /**
   * List of CLI arguments passed to the worker.
   * @default process.execArgv
   */
  execArgv?: string[];
  
  /**
   * Resource limits for the worker thread.
   */
  resourceLimits?: {
    /** Maximum size of the main heap in MB */
    maxOldGenerationSizeMb?: number;
    /** Maximum size of a heap space for recently created objects */
    maxYoungGenerationSizeMb?: number;
    /** The size of a pre-allocated memory range used for generated code */
    codeRangeSizeMb?: number;
    /** The default maximum stack size for the thread */
    stackSizeMb?: number;
  };
  
  /**
   * Array of ArrayBuffer instances whose memory should be transferred
   * to the worker rather than cloned.
   */
  transferList?: ArrayBuffer[];
  
  /**
   * AbortSignal that can be used to cancel the worker.
   * When aborted, the worker will be terminated immediately.
   */
  signal?: AbortSignal;
  
  /**
   * Additional data to pass to the worker.
   * This will be available as `workerData` in the worker thread.
   */
  workerData?: any;
};

/**
 * Options for configuring task execution with automatic worker fallback.
 * @template T Type of the input data
 */
type TaskOptions<T = any> = {
  /**
   * Whether to attempt using worker threads.
   * If false or workers are not supported, falls back to main thread.
   * @default true
   */
  useWorker?: boolean;
  
  /**
   * Path to the worker module.
   * Required if useWorker is true.
   */
  workerModule?: string;
  
  /**
   * Callback invoked when falling back to main thread execution.
   * @param error The error that caused the fallback
   */
  onFallback?: (error: Error) => void;
  
  /**
   * Callback for worker-specific errors.
   * These errors don't trigger fallback to main thread.
   */
  onWorkerError?: (error: Error) => void;
  
  /**
   * Options passed to the worker thread.
   * @see WorkerOptions
   */
  workerOptions?: WorkerOptions;
};

/**
 * Result object returned by worker operations.
 * @template T Type of the result data
 */
type WorkerResult<T = any> = {
  /** The data returned by the worker */
  data: T;
  /** Standard output from the worker */
  stdout: string;
  /** Standard error output from the worker */
  stderr: string;
};
```

##### Function Signatures

```typescript
/**
 * Runs a module in a worker thread.
 * @template T Type of the expected result
 * @param modulePath Path to the worker module (must be an ES module)
 * @param data Data to pass to the worker
 * @param options Worker configuration options
 * @returns A promise that resolves with the worker's result
 * @throws {Error} If the worker fails or is terminated
 * 
 * @example
 * const result = await runInWorker<number>('./worker.js', { x: 2, y: 3 });
 * console.log(result.data); // 5
 */
declare function runInWorker<T = any>(
  modulePath: string,
  data: any,
  options?: WorkerOptions
): Promise<WorkerResult<T>>;

/**
 * Runs a task with automatic worker fallback.
 * @template T Type of the input data
 * @template R Type of the result
 * @param task The task function to execute
 * @param data Input data for the task
 * @param options Task configuration
 * @returns A promise that resolves with the task result
 * 
 * @example
 * const processData = (data: { numbers: number[] }) => {
 *   return data.numbers.reduce((a, b) => a + b, 0);
 * };
 * 
 * const sum = await runTask(
 *   processData,
 *   { numbers: [1, 2, 3, 4] },
 *   { workerModule: './worker.js' }
 * );
 */
declare function runTask<T = any, R = any>(
  task: (data: T) => R | Promise<R>,
  data: T,
  options?: TaskOptions
): Promise<R>;

/**
 * Gets information about worker support in the current environment.
 * @returns Worker support information
 */
declare function getWorkerSupport(): WorkerSupport;

/**
 * Logs worker support information to the console or custom logger.
 * @param logger Custom logger object (defaults to console)
 * @returns Worker support information
 */
declare function logWorkerSupport(logger?: {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}): WorkerSupport;
```

##### TypeScript Configuration

For best results, ensure your `tsconfig.json` includes these settings:

```json
{
  "compilerOptions": {
    "moduleResolution": "node16",
    "target": "ES2020",
    "module": "ESNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

##### Type Safety with Workers

When creating worker modules, you can use the following pattern for type safety:

```typescript
// types.ts
export interface WorkerInput {
  x: number;
  y: number;
}

export interface WorkerOutput {
  result: number;
  timestamp: string;
}

// worker.ts
export default function workerTask(input: WorkerInput): WorkerOutput {
  return {
    result: input.x + input.y,
    timestamp: new Date().toISOString()
  };
}

// main.ts
import { runInWorker } from 'uniconnect/workers/main';
import type { WorkerInput, WorkerOutput } from './types';

async function calculate() {
  const result = await runInWorker<WorkerOutput>(
    './worker.js',
    { x: 10, y: 20 } as WorkerInput
  );
  
  // result.data is properly typed as WorkerOutput
  console.log(`Result: ${result.data.result} at ${result.data.timestamp}`);
}
```

#### API Reference

##### `runTask(task, data, options)`
The main function for running tasks with automatic worker fallback.

**Parameters:**
- `task: Function` - The task function to execute (runs in main thread if worker fails or is unavailable)
- `data: any` - Data to pass to the task function
- `options: Object` - Configuration options
  - `useWorker: boolean` - Whether to use worker threads (default: `true`)
  - `workerModule: string` - Path to worker module (required if `useWorker` is `true`)
  - `onFallback: Function(error)` - Called when falling back to main thread
  - `onWorkerError: Function(error)` - Called when worker encounters an error
  - `workerOptions: Object` - Options passed to the worker
    - `env: Object` - Environment variables for the worker
    - `execArgv: string[]` - Node.js CLI options
    - `resourceLimits: Object` - Worker resource limits
    - `transferList: ArrayBuffer[]` - List of transferable objects

**Returns:** `Promise<any>` - The result of the task

##### `runInWorker(modulePath, data, options)`
Lower-level function to run a task in a worker thread.

**Parameters:**
- `modulePath: string` - Path to the worker module
- `data: any` - Data to pass to the worker
- `options: Object` - Worker options (same as `workerOptions` above)

**Returns:** `Promise<{data: any, stdout: string, stderr: string}>`

##### `getWorkerSupport()`
Gets information about worker support in the current environment.

**Returns:** `Object` - Support information including version, availability, and messages

#### Basic Usage

```javascript
import { runTask } from 'uniconnect/workers/bridge';
import { getWorkerSupport } from 'uniconnect/workers/main';

// Check worker support
const support = getWorkerSupport();
console.log('Worker support:', support);

// Define a task function
const heavyTask = (data) => {
  // This will run in a worker thread if available
  return {
    result: data.input * 2,
    processedAt: new Date().toISOString()
  };
};

// Run the task with automatic fallback
const result = await runTask(heavyTask, { input: 42 }, {
  workerModule: './path/to/worker.mjs', // Path to worker module
  onFallback: (reason) => {
    console.log('Falling back to main thread:', reason.message);
  },
  onWorkerError: (error) => {
    console.error('Worker error:', error.message);
  }
});
```

#### Worker Module Example

Create a worker module (`worker.mjs`):

```javascript
// worker.mjs
export default function workerTask(data) {
  // This code runs in a worker thread
  return {
    result: data.input * 2,
    processedAt: new Date().toISOString()
  };
}
```

#### Complex Examples

##### 1. Data Processing Pipeline with Workers

```javascript
import { runTask } from 'uniconnect/workers/bridge';
import { pipeline } from 'node:stream/promises';
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';

// Process large files in chunks using workers
async function processLargeFile(filePath) {
  const results = [];
  
  await pipeline(
    createReadStream(filePath),
    createGunzip(),
    async function* (source) {
      let chunkNumber = 0;
      for await (const chunk of source) {
        const result = await runTask(
          processChunk,
          { chunk, chunkNumber++ },
          { workerModule: './workers/process-chunk.mjs' }
        );
        results.push(result);
        yield result;
      }
    }
  );
  
  return results;
}
```

##### 2. Parallel Task Execution with Pooling

```javascript
import { WorkerPool } from 'uniconnect/workers/pool';

// Create a pool of 4 workers
const pool = new WorkerPool('./workers/task-worker.mjs', 4);

// Process multiple items in parallel
async function processBatch(items) {
  const results = await Promise.all(
    items.map(item => 
      pool.run(item, {
        // Worker-specific options
        resourceLimits: { 
          maxOldGenerationSizeMb: 512,
          maxYoungGenerationSizeMb: 256
        },
        // Timeout after 30 seconds
        signal: AbortSignal.timeout(30000)
      })
    )
  );
  
  return results;
}
```

##### 3. Real-time Data Processing

```javascript
import { EventEmitter } from 'node:events';
import { fromEvent } from 'uniconnect';
import { runTask } from 'uniconnect/workers/bridge';

// Process real-time events with workers
class EventProcessor {
  constructor() {
    this.emitter = new EventEmitter();
    this.running = false;
  }
  
  async start() {
    this.running = true;
    
    // Convert event emitter to async iterator
    for await (const event of fromEvent(this.emitter, 'data')) {
      if (!this.running) break;
      
      try {
        const result = await runTask(
          processEvent,
          { event, timestamp: Date.now() },
          { 
            workerModule: './workers/event-processor.mjs',
            onFallback: () => console.warn('Falling back to main thread')
          }
        );
        
        this.emit('processed', result);
      } catch (error) {
        this.emit('error', error);
      }
    }
  }
  
  stop() {
    this.running = false;
  }
}
```

#### Direct Worker Usage

```javascript
import { runInWorker } from 'uniconnect/workers/main';

// Example with advanced options
const result = await runInWorker(
  './workers/complex-task.mjs',
  { 
    input: 'data',
    options: { maxIterations: 1000 }
  },
  {
    // Environment variables
    env: { 
      NODE_ENV: 'production',
      DEBUG: 'worker:*'
    },
    
    // Resource limits
    resourceLimits: {
      maxOldGenerationSizeMb: 1024,
      maxYoungGenerationSizeMb: 512,
      codeRangeSizeMb: 128,
      stackSizeMb: 4
    },
    
    // CLI arguments
    execArgv: [
      '--cpu-prof',
      '--heap-prof',
      '--max-semi-space-size=128'
    ],
    
    // Transfer ownership of ArrayBuffer
    transferList: [largeBuffer.buffer],
    
    // Timeout after 1 minute
    signal: AbortSignal.timeout(60000)
  }
);
```

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
# salahor

Zero-dependency universal connectors between Events, EventTargets and AsyncIterables with lightweight operators. Node 18+.
![npm version](https://img.shields.io/npm/v/salahor?color=%2300a) ![node version](https://img.shields.io/badge/node-%3E%3D18-3c873a) ![license](https://img.shields.io/badge/license-MIT-blue) ![minzipped size](https://img.shields.io/bundlephobia/minzip/salahor) ![test coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

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
npm install salahor
```

## 🚀 Getting Started

### Installation
```sh
npm install salahor
# or
yarn add salahor
# or
pnpm add salahor
```

## Usage

### From EventEmitter to AsyncIterable

```js
import { fromEventEmitter, take, pipe } from 'salahor';
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
import { fromEventTarget } from 'salahor';
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
import { pipe, map, filter, buffer } from 'salahor';

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
import { retryIterable } from 'salahor';

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

salahor provides specific error types for better error handling:

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
import { fromEventEmitter, withQueue, pipe, map } from 'salahor';

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
import { merge, zip, pipe, map, filter } from 'salahor';

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
import { toEventEmitter } from 'salahor';
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
import { fromEventTarget } from 'salahor';
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
# salahor
