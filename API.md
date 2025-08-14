# Salahor API Reference

This document provides a comprehensive reference for the Salahor library's core APIs.

## Table of Contents

- [Core](#core)
  - [createEventStream](#createeventstream)
  - [EventStream](#eventstream)
  - [Observer](#observer)
  - [Subscription](#subscription)
- [Operators](#operators)
  - [map](#map)
  - [filter](#filter)
  - [take](#take)
  - [skip](#skip)
  - [debounceTime](#debouncetime)
  - [throttleTime](#throttletime)
  - [distinctUntilChanged](#distinctuntilchanged)
  - [scan](#scan)
  - [merge](#merge)
  - [concat](#concat)
  - [combineLatest](#combinelatest)
  - [withLatestFrom](#withlatestfrom)
  - [startWith](#startwith)
  - [endWith](#endwith)
  - [catchError](#catcherror)
  - [retry](#retry)
  - [finalize](#finalize)
- [Utilities](#utilities)
  - [isEventStream](#iseventstream)
  - [fromPromise](#frompromise)
  - [fromEvent](#fromevent)
  - [interval](#interval)
  - [timer](#timer)
  - [empty](#empty)
  - [never](#never)
  - [throwError](#throwerror)

## Core

### `createEventStream<T>()`

Creates a new event stream that can emit values of type `T`.

**Type Parameters:**
- `T` - The type of values the stream will emit

**Returns:** `EventStream<T>` - A new event stream instance

**Example:**
```typescript
import { createEventStream } from '@salahor/core';

const stream = createEventStream<number>();
stream.subscribe({
  next: value => console.log(value)
});

stream.next(42); // Logs: 42
```

### `EventStream<T>`

A stream of events that can be observed and transformed.

#### Methods

- **`subscribe(observer: Observer<T>): () => void`**
  Subscribes to the stream with an observer object.

  **Parameters:**
  - `observer`: An object with `next`, `error`, and `complete` callbacks

  **Returns:** A function to unsubscribe

- **`next(value: T): void`**
  Emits a new value to the stream.

- **`error(error: Error): void`**
  Emits an error to the stream.

- **`complete(): void`**
  Completes the stream.

- **`pipe<A>(op1: OperatorFunction<T, A>): EventStream<A>`**
  Pipes the stream through one or more operators.

  **Type Parameters:**
  - `A` - The type of the resulting stream

  **Parameters:**
  - `op1` - The operator function to apply

  **Returns:** A new transformed stream

### `Observer<T>`

An interface for objects that handle stream notifications.

```typescript
interface Observer<T> {
  next: (value: T) => void;
  error?: (error: Error) => void;
  complete?: () => void;
}
```

### `Subscription`

A function that, when called, unsubscribes from the stream.

**Type:** `() => void`

## Operators

### `map<T, R>(mapper: (value: T) => R): OperatorFunction<T, R>`

Transforms each value from the source stream using the provided mapping function.

**Example:**
```typescript
import { map } from '@salahor/core/operators';

source$.pipe(
  map(x => x * 2)
).subscribe(console.log);
```

### `filter<T>(predicate: (value: T) => boolean): OperatorFunction<T, T>`

Filters values from the source stream based on a predicate function.

**Example:**
```typescript
import { filter } from '@salahor/core/operators';

source$.pipe(
  filter(x => x % 2 === 0)
).subscribe(console.log);
```

### `take<T>(count: number): OperatorFunction<T, T>`

Takes the first `count` values from the source stream, then completes.

**Example:**
```typescript
import { take } from '@salahor/core/operators';

source$.pipe(
  take(3)
).subscribe(console.log);
```

### `skip<T>(count: number): OperatorFunction<T, T>`

Skips the first `count` values from the source stream.

**Example:**
```typescript
import { skip } from '@salahor/core/operators';

source$.pipe(
  skip(2)
).subscribe(console.log);
```

### `debounceTime<T>(duration: number): OperatorFunction<T, T>`

Only emits a value from the source stream after a specified duration has passed without another source emission.

**Example:**
```typescript
import { debounceTime } from '@salahor/core/operators';

inputEvents$.pipe(
  debounceTime(300)
).subscribe(console.log);
```

### `throttleTime<T>(duration: number): OperatorFunction<T, T>`

Emits a value from the source stream, then ignores subsequent values for the given duration.

**Example:**
```typescript
import { throttleTime } from '@salahor/core/operators';

scrollEvents$.pipe(
  throttleTime(200)
).subscribe(console.log);
```

### `distinctUntilChanged<T>(compare?: (a: T, b: T) => boolean): OperatorFunction<T, T>`

Only emits when the current value is different from the last emitted value.

**Example:**
```typescript
import { distinctUntilChanged } from '@salahor/core/operators';

source$.pipe(
  distinctUntilChanged()
).subscribe(console.log);
```

### `scan<T, R>(accumulator: (acc: R, current: T) => R, seed: R): OperatorFunction<T, R>`

Applies an accumulator function over the source stream, and returns each intermediate result.

**Example:**
```typescript
import { scan } from '@salahor/core/operators';

source$.pipe(
  scan((acc, curr) => acc + curr, 0)
).subscribe(console.log);
```

## Utilities

### `isEventStream(value: any): value is EventStream<unknown>`

Checks if the given value is an EventStream.

**Example:**
```typescript
import { isEventStream } from '@salahor/core';

if (isEventStream(value)) {
  // value is an EventStream
}
```

### `fromPromise<T>(promise: Promise<T>): EventStream<T>`

Creates an event stream from a Promise.

**Example:**
```typescript
import { fromPromise } from '@salahor/core';

const stream = fromPromise(fetchData());
```

### `fromEvent<T>(target: EventTarget, eventName: string): EventStream<T>`

Creates an event stream from DOM events.

**Example:**
```typescript
import { fromEvent } from '@salahor/core';

const clicks = fromEvent(document, 'click');
```

### `interval(period: number): EventStream<number>`

Creates an event stream that emits sequential numbers at a specified interval.

**Example:**
```typescript
import { interval } from '@salahor/core';

const counter = interval(1000); // emits 0, 1, 2, ... every second
```

### `timer(dueTime: number, period?: number): EventStream<number>`

Creates an event stream that starts after a specified delay and emits increasing numbers.

**Example:**
```typescript
import { timer } from '@salahor/core';

// Wait 1s, then emit 0 after 1s, then complete
const timer1 = timer(1000);

// Wait 1s, then emit 0, 1, 2, ... every 1s
const timer2 = timer(1000, 1000);
```

### `empty(): EventStream<never>`

Creates an event stream that immediately completes without emitting any values.

**Example:**
```typescript
import { empty } from '@salahor/core';

const stream = empty();
```

### `never(): EventStream<never>`

Creates an event stream that never emits any values and never completes.

**Example:**
```typescript
import { never } from '@salahor/core';

const stream = never();
```

### `throwError(error: Error): EventStream<never>`

Creates an event stream that immediately errors with the specified error.

**Example:**
```typescript
import { throwError } from '@salahor/core';

const stream = throwError(new Error('Something went wrong'));
```

## Type Definitions

### `OperatorFunction<T, R>`

A function that takes an event stream of type `T` and returns an event stream of type `R`.

```typescript
type OperatorFunction<T, R> = (source: EventStream<T>) => EventStream<R>;
```

### `UnaryFunction<T, R>`

A function that takes one argument of type `T` and returns a value of type `R`.

```typescript
type UnaryFunction<T, R> = (source: T) => R;
```

## Error Handling

All operators that accept functions as arguments will handle errors thrown in those functions by sending them to the error handler of the observer. If no error handler is provided, the error will be thrown asynchronously using `setTimeout`.

**Example of error handling:**
```typescript
import { createEventStream } from '@salahor/core';

const stream = createEventStream<number>();

stream.subscribe({
  next: value => {
    if (value === 0) throw new Error('Zero is not allowed');
    console.log(value);
  },
  error: err => console.error('Error:', err.message)
});

stream.next(1);  // Logs: 1
stream.next(0);  // Logs: "Error: Zero is not allowed"
```

## Practical Examples

### 1. Real-time Search with Debounce

```typescript
import { createEventStream, debounceTime, filter, map } from '@salahor/core';

// Simulate search input
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// Create a stream of search terms
const searchTerm$ = createEventStream<string>();

// Listen to input events
searchInput.addEventListener('input', (e) => {
  searchTerm$.next(e.target.value);
});

// Process search with debounce
searchTerm$.pipe(
  debounceTime(300),         // Wait 300ms after user stops typing
  filter(term => term.length > 2),  // Only search if term has more than 2 chars
  map(term => term.trim().toLowerCase())
).subscribe(async (term) => {
  const results = await searchAPI(term);
  displayResults(results);
});
```

### 2. Form Validation

```typescript
import { createEventStream, map, combineLatest } from '@salahor/core';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitButton = document.getElementById('submit');

// Create streams for form fields
const email$ = createEventStream<string>();
const password$ = createEventStream<string>();

// Listen to input changes
emailInput.addEventListener('input', (e) => email$.next(e.target.value));
passwordInput.addEventListener('input', (e) => password$.next(e.target.value));

// Validate email
const isEmailValid$ = email$.pipe(
  map(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
);

// Validate password (at least 8 chars)
const isPasswordValid$ = password$.pipe(
  map(password => password.length >= 8)
);

// Combine validations
const isFormValid$ = combineLatest(
  [isEmailValid$, isPasswordValid$],
  (emailValid, passwordValid) => emailValid && passwordValid
);

// Update submit button state
isFormValid$.subscribe(isValid => {
  submitButton.disabled = !isValid;
});
```

### 3. Drag and Drop with Streams

```typescript
import { createEventStream, map, switchMap, takeUntil } from '@salahor/core';

const draggable = document.getElementById('draggable');
const container = document.getElementById('container');

// Create streams for mouse events
const mouseDown$ = createEventStream<MouseEvent>();
const mouseMove$ = createEventStream<MouseEvent>();
const mouseUp$ = createEventStream<MouseEvent>();

// Listen to events
draggable.addEventListener('mousedown', (e) => mouseDown$.next(e));
document.addEventListener('mousemove', (e) => mouseMove$.next(e));
document.addEventListener('mouseup', (e) => mouseUp$.next(e));

// Handle drag and drop
const drag$ = mouseDown$.pipe(
  switchMap(startEvent => {
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const rect = draggable.getBoundingClientRect();
    
    return mouseMove$.pipe(
      map(moveEvent => ({
        x: moveEvent.clientX - startX + rect.left,
        y: moveEvent.clientY - startY + rect.top
      })),
      takeUntil(mouseUp$)
    );
  })
);

// Update element position
drag$.subscribe(({ x, y }) => {
  draggable.style.transform = `translate(${x}px, ${y}px)`;
});
```

### 4. API Polling with Error Handling

```typescript
import { interval, mergeMap, catchError, retry } from '@salahor/core';

function fetchData() {
  return fetch('https://api.example.com/data')
    .then(response => response.json());
}

// Poll every 5 seconds
const polledData$ = interval(5000).pipe(
  mergeMap(() => fetchData()),
  retry(3), // Retry up to 3 times on error
  catchError(error => {
    console.error('Failed to fetch data:', error);
    return []; // Return empty array on error
  })
);

// Subscribe to updates
polledData$.subscribe({
  next: data => updateUI(data),
  error: err => showError('Failed to load data')
});
```

## Best Practices

1. **Always clean up subscriptions** to prevent memory leaks:
   ```typescript
   const subscription = stream.subscribe(/* ... */);
   // Later, when done:
   subscription();
   ```

2. **Use the `pipe` method** for better readability with multiple operators:
   ```typescript
   stream.pipe(
     filter(x => x > 10),
     map(x => x * 2),
     take(5)
   ).subscribe(console.log);
   ```

3. **Handle errors** in your subscriptions to prevent uncaught exceptions:
   ```typescript
   stream.subscribe({
     next: console.log,
     error: console.error
   });
   ```

4. **Use TypeScript** for better type safety and developer experience.

## Browser Support

The library works in all modern browsers and Node.js environments. For older browsers, you may need to include polyfills for:
- `Promise`
- `Object.entries`
- `Object.values`
- `Array.prototype.includes`

## License

MIT © [Your Name](https://github.com/yourusername)
