# @salahor/core

Core event stream implementation and utilities for the Salahor ecosystem. Provides a reactive programming model for handling asynchronous event streams with a simple and consistent API.

## Features

- 🚀 Lightweight and performant event stream implementation
- 🔄 Support for both push and pull-based data flows
- 🧩 Extensible operator system for stream transformations
- 🛠 TypeScript-first with full type safety
- 🔄 Backpressure handling and flow control
- 🧪 Comprehensive test coverage

## Installation

```bash
# Using pnpm (recommended)
pnpm add @salahor/core

# Using npm
npm install @salahor/core

# Using yarn
yarn add @salahor/core
```

## Quick Start

### Basic Usage

```typescript
import { createEventStream } from '@salahor/core';

// Create a new event stream
const stream = createEventStream<number>();

// Subscribe to the stream
const unsubscribe = stream.subscribe({
  next: (value) => console.log('Received:', value),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Stream completed')
});

// Emit values
stream.next(1);
stream.next(2);

// Complete the stream
stream.complete();

// Clean up
unsubscribe();
```

### Using Operators

```typescript
import { createEventStream, map, filter } from '@salahor/core';

const numberStream = createEventStream<number>();

// Create a transformed stream
const squaredStream = numberStream.pipe(
  filter(x => x % 2 === 0),  // Only even numbers
  map(x => x * x)             // Square them
);

// Subscribe to the transformed stream
squaredStream.subscribe({
  next: value => console.log('Squared even number:', value)
});

// Emit values
[1, 2, 3, 4, 5].forEach(n => numberStream.next(n));
// Output: "Squared even number: 4", "Squared even number: 16"
```

## API Reference

### `createEventStream<T>()`

Creates a new event stream of type `T`.

**Returns:** `EventStream<T>`

### `EventStream<T>`

#### Methods

- `subscribe(observer: Observer<T>): () => void`
  - Subscribes to the stream with an observer object
  - Returns an unsubscribe function

- `next(value: T): void`
  - Emits a new value to the stream

- `error(error: Error): void`
  - Emits an error to the stream

- `complete(): void`
  - Completes the stream

- `pipe(...operators: OperatorFunction<any, any>[]): EventStream<any>`
  - Pipes the stream through one or more operators

### Built-in Operators

- `map<T, R>(mapper: (value: T) => R)`: Transforms each value in the stream
- `filter<T>(predicate: (value: T) => boolean)`: Filters values based on a predicate
- `take<T>(count: number)`: Takes the first `count` values from the stream
- `skip<T>(count: number)`: Skips the first `count` values from the stream
- `debounceTime<T>(duration: number)`: Only emits a value after a specified duration has passed
- `throttleTime<T>(duration: number)`: Emits a value, then ignores subsequent values for a duration
- `distinctUntilChanged<T>(compare?: (a: T, b: T) => boolean)`: Only emits when the current value is different from the last
- `scan<T, R>(accumulator: (acc: R, current: T) => R, seed: R)`: Applies an accumulator function over the stream

## Advanced Usage

### Creating Custom Operators

```typescript
import { OperatorFunction } from '@salahor/core';

function multiplyBy(factor: number): OperatorFunction<number, number> {
  return source => ({
    subscribe(observer) {
      return source.subscribe({
        next: value => observer.next(value * factor),
        error: err => observer.error(err),
        complete: () => observer.complete()
      });
    }
  });
}

// Usage
const stream = createEventStream<number>();
stream.pipe(multiplyBy(2)).subscribe({
  next: value => console.log(value) // Doubles all values
});
```

### Error Handling

```typescript
const stream = createEventStream<number>();

stream.subscribe({
  next: value => {
    if (value === 0) {
      throw new Error('Zero is not allowed');
    }
    console.log(value);
  },
  error: err => console.error('Caught error:', err.message)
});

stream.next(1);  // Logs: 1
stream.next(0);  // Logs: "Caught error: Zero is not allowed"
```

## Development

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Run tests: `pnpm test`
4. Build the package: `pnpm build`
5. Run benchmarks: `pnpm bench`

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/yourusername/salahor/blob/main/CONTRIBUTING.md) for details.

## License

MIT © [Your Name](https://github.com/yourusername)
