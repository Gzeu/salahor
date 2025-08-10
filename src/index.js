// uniconnect - zero-dependency connectors and operators
// Node 18+, ESM

import { withQueue } from './withQueue.js';
import { QUEUE_POLICIES, ERROR_MESSAGES } from './constants.js';

// Export error classes for use in other modules
export class UniconnectError extends Error {
  constructor(message, code = 'UNICONNECT_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class AbortError extends UniconnectError {
  constructor(message = 'Operation was aborted') {
    super(message, 'ABORT_ERR');
  }
}

export class QueueOverflowError extends UniconnectError {
  constructor(message = 'Queue overflow') {
    super(message, 'QUEUE_OVERFLOW');
  }
}

export class ValidationError extends UniconnectError {
  constructor(message = 'Invalid argument') {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotSupportedError extends UniconnectError {
  constructor(message = 'Operation not supported') {
    super(message, 'NOT_SUPPORTED');
  }
}

// Error classes are now defined at the top of the file with export statements



/**
 * Check if an object is an EventTarget
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object is an EventTarget
 */
function isEventTarget(obj) {
  return !!obj && typeof obj.addEventListener === 'function' && typeof obj.removeEventListener === 'function';
}

/**
 * Check if an object is an EventEmitter
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object is an EventEmitter
 */
function isEventEmitter(obj) {
  return !!obj && (
    (typeof obj.on === 'function' && typeof obj.off === 'function') ||
    (typeof obj.addListener === 'function' && typeof obj.removeListener === 'function')
  );
}

/**
 * Creates an async queue for buffering values between producers and consumers
 * @param {Object} [options={}] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the queue
 * @param {number} [options.queueLimit=0] - Maximum queue size (0 = unlimited)
 * @param {'drop-old'|'drop-new'|'throw'} [options.onOverflow='throw'] - Behavior on queue overflow
 * @returns {Object} Queue instance with async iterator interface
 * @throws {TypeError} If queueLimit is not a non-negative number
 * @throws {TypeError} If onOverflow is not one of 'drop-old', 'drop-new', or 'throw'
 */
// Error messages are now imported from constants.js

// Reusable empty array for default values
const EMPTY_ARRAY = Object.freeze([]);

/**
 * Creates an optimized async queue for buffering values between producers and consumers
 * with configurable backpressure handling and memory management.
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the queue
 * @param {number} [options.queueLimit=0] - Maximum queue size (0 = unlimited)
 * @param {'drop-old'|'drop-new'|'throw'} [options.onOverflow='throw'] - Behavior on queue overflow
 * @returns {Object} Queue instance with async iterator interface
 * @throws {ValidationError} If queueLimit is not a non-negative number
 * @throws {ValidationError} If onOverflow is not one of 'drop-old', 'drop-new', or 'throw'
 */
function createAsyncQueue({ signal, queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW } = {}) {
  // Validate queueLimit once at creation time
  if (typeof queueLimit !== 'number' || !Number.isInteger(queueLimit) || queueLimit < 0) {
    throw new ValidationError(ERROR_MESSAGES.INVALID_QUEUE_LIMIT);
  }

  // Validate onOverflow policy
  const validPolicies = Object.values(QUEUE_POLICIES);
  if (!validPolicies.includes(onOverflow)) {
    throw new ValidationError(
      ERROR_MESSAGES.INVALID_OVERFLOW_POLICY(onOverflow, validPolicies)
    );
  }
  
  // Optimized queue implementation using a circular buffer
  let queue = [];
  let head = 0;
  let tail = 0;
  let size = 0;
  
  // Promise state for async iteration
  let resolveNext = null;
  let nextPromise = null;
  let isClosed = false;
  let error = null;
  
  // Initialize the first promise
  function resetNextPromise() {
    nextPromise = new Promise((resolve) => {
      resolveNext = (value) => {
        resolveNext = null;
        resolve(value);
      };
    });
  }
  resetNextPromise();

  // Set up abort handling if signal is provided
  let abortListener = null;
  if (signal) {
    if (signal.aborted) {
      handleAbort();
    } else {
      abortListener = () => handleAbort();
      signal.addEventListener('abort', abortListener, { once: true });
    }
  }

  // Helper functions
  function handleAbort() {
    if (isClosed) return;
    
    error = new AbortError(ERROR_MESSAGES.OPERATION_ABORTED);
    isClosed = true;
    
    // Clean up the queue to help GC
    queue = [];
    head = tail = size = 0;
    
    // Resolve any pending consumers
    if (resolveNext) {
      resolveNext({ done: true });
      resolveNext = null;
    }
    
    // Clean up the abort listener
    if (signal && abortListener) {
      signal.removeEventListener('abort', abortListener);
      abortListener = null;
    }
  }

  return {
    [Symbol.asyncIterator]() {
      return this;
    },

    async next() {
      // If there's an error, throw it immediately
      if (error) throw error;
      
      // Fast path: queue has items available
      if (size > 0) {
        const value = queue[head];
        // Help GC by clearing the reference
        queue[head] = undefined;
        head = (head + 1) % queue.length;
        size--;
        return { value, done: false };
      }
      
      // If queue is closed, we're done
      if (isClosed) {
        return { done: true };
      }
      
      // Wait for the next value or for the queue to close
      const result = await nextPromise;
      if (result.done) {
        return { done: true };
      }
      
      // The queue might have been modified while we were waiting
      if (size > 0) {
        const value = queue[head];
        queue[head] = undefined; // Clear reference
        head = (head + 1) % queue.length;
        size--;
        return { value, done: false };
      }
      
      return { value: result.value, done: false };
    },
    
    push(value) {
      if (isClosed) return false;
      
      // Handle queue limits
      if (queueLimit > 0 && size >= queueLimit) {
        switch (onOverflow) {
          case QUEUE_POLICIES.DROP_OLD:
            // Remove the oldest item
            queue[head] = undefined; // Clear reference
            head = (head + 1) % queue.length;
            size--;
            break;
            
          case QUEUE_POLICIES.DROP_NEW:
            return false;
            
          case QUEUE_POLICIES.THROW:
          default:
            throw new QueueOverflowError(ERROR_MESSAGES.QUEUE_OVERFLOW);
        }
      }
      
      // Add the new value
      if (size === queue.length) {
        // Need to grow the queue
        const newQueue = new Array(Math.max(1, queue.length * 2));
        for (let i = 0; i < size; i++) {
          newQueue[i] = queue[(head + i) % queue.length];
        }
        queue = newQueue;
        head = 0;
        tail = size;
      }
      
      queue[tail] = value;
      tail = (tail + 1) % queue.length;
      size++;
      
      // Notify any waiting consumers
      if (resolveNext) {
        const value = queue[head];
        const r = resolveNext;
        resetNextPromise();
        r({ value, done: false });
      }
      
      return true;
    },
    
    fail(err) {
      if (isClosed) return;
      
      error = err instanceof Error ? err : new Error(String(err));
      isClosed = true;
      
      // Clean up the queue
      queue = [];
      head = tail = size = 0;
      
      // Notify any waiting consumers
      if (resolveNext) {
        const r = resolveNext;
        resetNextPromise();
        r({ done: true });
      }
      
      // Clean up the abort listener
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
        abortListener = null;
      }
    },
    
    close() {
      if (isClosed) return;
      
      isClosed = true;
      
      // Clean up the queue
      queue = [];
      head = tail = size = 0;
      
      // Notify any waiting consumers
      if (resolveNext) {
        const r = resolveNext;
        resetNextPromise();
        r({ done: true });
      }
      
      // Clean up the abort listener
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
        abortListener = null;
      }
    },
    
    get size() {
      return size;
    },
    
    get isClosed() {
      return isClosed;
    },
    
    [Symbol.dispose]() {
      this.close();
    }
  };
}

// Cache for event handler functions to avoid creating new ones
const eventHandlerCache = new WeakMap();

/**
 * Creates an optimized async iterable from an EventTarget.
 * Uses weak references and efficient cleanup to prevent memory leaks.
 */
function fromEventTarget(target, eventName, { signal, queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW } = {}) {
  // Validate inputs
  if (!isEventTarget(target)) {
    throw new ValidationError('First argument must be an EventTarget');
  }
  if (typeof eventName !== 'string' || !eventName.trim()) {
    throw new ValidationError('Event name must be a non-empty string');
  }
  
  // Check if we already have a handler for this target and event
  let targetHandlers = eventHandlerCache.get(target);
  if (!targetHandlers) {
    targetHandlers = new Map();
    eventHandlerCache.set(target, targetHandlers);
  }
  
  // Create a unique cache key for this event and configuration
  const cacheKey = `${eventName}:${queueLimit}:${onOverflow}`;
  let handlerInfo = targetHandlers.get(cacheKey);
  
  if (!handlerInfo) {
    // Create a new queue for this event
    const queue = createAsyncQueue({ queueLimit, onOverflow });
    
    // Create a weak ref to the queue to allow garbage collection
    const queueRef = new WeakRef(queue);
    
    // The actual event handler
    const handler = (event) => {
      const q = queueRef.deref();
      if (q) q.push(event);
    };
    
    // Error handler
    const errorHandler = (event) => {
      const q = queueRef.deref();
      if (q) q.fail(event instanceof Error ? event : new Error(String(event)));
    };
    
    // Store the handlers and cleanup function
    handlerInfo = {
      queue,
      handler,
      errorHandler,
      refCount: 0,
      cleanup: () => {
        target.removeEventListener(eventName, handler);
        if (eventName !== 'error') {
          target.removeEventListener('error', errorHandler);
        }
        targetHandlers?.delete(cacheKey);
        if (targetHandlers?.size === 0) {
          eventHandlerCache.delete(target);
        }
      }
    };
    
    // Set up the event listeners
    target.addEventListener(eventName, handler);
    if (eventName !== 'error') {
      target.addEventListener('error', errorHandler);
    }
    
    targetHandlers.set(cacheKey, handlerInfo);
  }
  
  // Increment the reference counter
  handlerInfo.refCount++;
  
  // Create the async iterator
  const iterator = handlerInfo.queue[Symbol.asyncIterator]();
  let isDone = false;
  
  // Cleanup function
  const cleanup = () => {
    if (isDone) return;
    isDone = true;
    
    if (--handlerInfo.refCount <= 0) {
      handlerInfo.cleanup();
    }
  };
  
  // Handle abort signal if provided
  if (signal) {
    signal.addEventListener('abort', cleanup, { once: true });
  }
  
  // Return an async iterable that cleans up when done
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (isDone) return { done: true, value: undefined };
          
          try {
            const result = await iterator.next();
            if (result.done) cleanup();
            return result;
          } catch (error) {
            cleanup();
            throw error;
          }
        },
        async return() {
          cleanup();
          return { done: true, value: undefined };
        },
        async throw(error) {
          cleanup();
          return Promise.reject(error);
        }
      };
    }
  };
}

// Cache for EventEmitter handlers
const emitterHandlerCache = new WeakMap();

/**
 * Creates an optimized async iterable from an EventEmitter.
 * Uses weak references and efficient cleanup to prevent memory leaks.
 */
function fromEventEmitter(emitter, eventName, { signal, queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW } = {}) {
  // Validate inputs
  if (!isEventEmitter(emitter)) {
    throw new ValidationError('First argument must be an EventEmitter');
  }
  if (typeof eventName !== 'string' || !eventName.trim()) {
    throw new ValidationError('Event name must be a non-empty string');
  }
  
  // Check if we already have a handler for this emitter and event
  let emitterHandlers = emitterHandlerCache.get(emitter);
  if (!emitterHandlers) {
    emitterHandlers = new Map();
    emitterHandlerCache.set(emitter, emitterHandlers);
  }
  
  // Create a unique cache key for this event and configuration
  const cacheKey = `${eventName}:${queueLimit}:${onOverflow}`;
  let handlerInfo = emitterHandlers.get(cacheKey);
  
  if (!handlerInfo) {
    // Create a new queue for this event
    const queue = createAsyncQueue({ queueLimit, onOverflow });
    
    // Create a weak ref to the queue to allow garbage collection
    const queueRef = new WeakRef(queue);
    
    // The actual event handler
    const handler = (...args) => {
      const q = queueRef.deref();
      if (q) {
        // For EventEmitter, we pass all arguments to maintain compatibility
        // with Node.js EventEmitter behavior, but optimize for single-arg case
        q.push(args.length <= 1 ? args[0] : args);
      }
    };
    
    // Error handler
    const errorHandler = (err) => {
      const q = queueRef.deref();
      if (q) q.fail(err);
    };
    
    // Store the handlers and cleanup function
    handlerInfo = {
      queue,
      handler,
      errorHandler,
      refCount: 0,
      cleanup: () => {
        emitter.off(eventName, handler);
        if (eventName !== 'error') {
          emitter.off('error', errorHandler);
        }
        emitterHandlers?.delete(cacheKey);
        if (emitterHandlers?.size === 0) {
          emitterHandlerCache.delete(emitter);
        }
      }
    };
    
    // Set up the event listeners
    emitter.on(eventName, handler);
    
    // Handle 'error' events if no error handler is set
    if (eventName !== 'error' && !emitter.eventNames().includes('error')) {
      emitter.on('error', errorHandler);
    }
    
    emitterHandlers.set(cacheKey, handlerInfo);
  }
  
  // Increment the reference counter
  handlerInfo.refCount++;
  
  // Create the async iterator
  const iterator = handlerInfo.queue[Symbol.asyncIterator]();
  let isDone = false;
  
  // Cleanup function
  const cleanup = () => {
    if (isDone) return;
    isDone = true;
    
    if (--handlerInfo.refCount <= 0) {
      handlerInfo.cleanup();
    }
  };
  
  // Handle abort signal if provided
  if (signal) {
    signal.addEventListener('abort', cleanup, { once: true });
  }
  
  // Return an async iterable that cleans up when done
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (isDone) return { done: true, value: undefined };
          
          try {
            const result = await iterator.next();
            if (result.done) cleanup();
            return result;
          } catch (error) {
            cleanup();
            throw error;
          }
        },
        async return() {
          cleanup();
          return { done: true, value: undefined };
        },
        async throw(error) {
          cleanup();
          return Promise.reject(error);
        }
      };
    }
  };
}

export async function toEventEmitter(asyncIterable, emitter, eventName) {
  const add = emitter.emit ? 'emit' : null;
  if (!add) throw new TypeError('Provided emitter has no emit()');
  for await (const v of asyncIterable) {
    emitter[add](eventName, v);
  }
}

// operators
export function map(fn) {
  return async function* (iterable) {
    let i = 0;
    for await (const v of iterable) {
      yield fn(v, i++);
    }
  };
}

export function filter(fn) {
  return async function* (iterable) {
    let i = 0;
    for await (const v of iterable) {
      if (fn(v, i++)) yield v;
    }
  };
}

export function take(n) {
  return async function* (iterable) {
    if (n <= 0) return;
    let i = 0;
    for await (const v of iterable) {
      yield v;
      if (++i >= n) break;
    }
  };
}

export function buffer(size) {
  if (size <= 0) throw new RangeError('buffer size must be > 0');
  return async function* (iterable) {
    let buf = [];
    for await (const v of iterable) {
      buf.push(v);
      if (buf.length >= size) {
        yield buf;
        buf = [];
      }
    }
    if (buf.length) yield buf;
  };
}

export function pipe(iterable, ...ops) {
  return ops.reduce((it, op) => op(it), iterable);
}

// Retry helper for re-creating an iterable factory upon error
export async function* retryIterable(factory, { attempts = 3, delay = 0 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      for await (const v of factory()) {
        yield v;
      }
      return; // completed successfully
    } catch (err) {
      lastErr = err;
      if (attempt + 1 >= attempts) break;
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export function toAsyncIterable(source, eventName, options) {
  if (isEventTarget(source)) return fromEventTarget(source, eventName, options);
  if (isEventEmitter(source)) return fromEventEmitter(source, eventName, options);
  throw new TypeError('Unsupported source type; expected EventTarget or EventEmitter');
}

// Additional operators
export function scan(reducer, seed) {
  const hasSeed = arguments.length >= 2;
  return async function* (iterable) {
    let acc = seed;
    let i = 0;
    for await (const v of iterable) {
      if (!hasSeed && i === 0) {
        acc = v;
      } else {
        acc = reducer(acc, v, i);
      }
      i++;
      yield acc;
    }
  };
}

export function distinctUntilChanged(equals = (a, b) => a === b) {
  return async function* (iterable) {
    let first = true;
    let prev;
    for await (const v of iterable) {
      if (first || !equals(prev, v)) {
        first = false;
        prev = v;
        yield v;
      }
    }
  };
}

/**
 * Creates a new async iterable that only emits a value from the source iterable
 * after a particular time span has passed without another source emission.
 * @param {number} ms - The timeout in milliseconds
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 * @throws {ValidationError} If ms is negative
 */
export function debounceTime(ms) {
  if (ms < 0) throw new ValidationError('ms must be >= 0');
  
  return async function* (iterable) {
    let timer = null;
    let pending;
    let resolveFlush = null;
    let isDone = false;
    let sourceDone = false;

    // Reusable cleanup function
    const cleanup = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (resolveFlush !== null) {
        const r = resolveFlush;
        resolveFlush = null;
        r(false); // Resolve with false to indicate cancellation
      }
    };

    // Process pending value if any
    const processPending = () => {
      if (pending === undefined) return Promise.resolve();
      
      const valueToEmit = pending;
      pending = undefined;
      
      // Return a promise that resolves when the debounce period is complete
      return new Promise((resolve) => {
        cleanup(); // Clear any pending timers
        timer = setTimeout(() => {
          timer = null;
          resolve({ shouldEmit: true, value: valueToEmit });
        }, ms);
        
        // Store resolve for potential cancellation
        resolveFlush = (result) => resolve({ shouldEmit: result, value: valueToEmit });
      });
    };

    // Process the source iterable
    const processSource = async function* () {
      for await (const value of iterable) {
        if (isDone) break;
        
        pending = value;
        const result = await processPending();
        
        if (result.shouldEmit && !isDone) {
          yield result.value;
        }
      }
      
      // Source is done, process any remaining pending value
      sourceDone = true;
      if (pending !== undefined) {
        const result = await processPending();
        if (result.shouldEmit && !isDone) {
          yield result.value;
        }
      }
    };

    try {
      yield* processSource();
    } finally {
      // Cleanup on early return/cancel
      cleanup();
    }
  };
}

/**
 * Creates a new async iterable that emits values from the source iterable at most once
 * per specified time interval, with options for leading/trailing emissions.
 * @param {number} ms - The throttle duration in milliseconds
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.leading=true] - Whether to emit the first value in the interval
 * @param {boolean} [options.trailing=true] - Whether to emit the last value in the interval
 * @returns {Operator} A function that takes an async iterable and returns a new async iterable
 * @throws {ValidationError} If ms is negative
 */
export function throttleTime(ms, { leading = true, trailing = true } = {}) {
  if (ms < 0) throw new ValidationError('ms must be >= 0');
  
  return async function* (iterable) {
    let lastEmitTime = 0;
    let pendingValue;
    let isThrottleActive = false;
    let isSourceDone = false;
    let resolveWait = null;
    
    // Helper to wait for the throttle interval
    const waitForThrottle = () => {
      return new Promise((resolve) => {
        const remaining = ms - (Date.now() - lastEmitTime);
        if (remaining <= 0) {
          resolve();
        } else {
          const timer = setTimeout(() => {
            if (resolveWait === resolve) resolveWait = null;
            resolve();
          }, remaining);
          
          // Store resolve for potential cancellation
          resolveWait = () => {
            clearTimeout(timer);
            resolve();
          };
        }
      });
    };
    
    // Process pending value if any
    const processPending = () => {
      if (pendingValue === undefined) return;
      
      const valueToEmit = pendingValue;
      pendingValue = undefined;
      lastEmitTime = Date.now();
      return valueToEmit;
    };
    
    // Cleanup function
    const cleanup = () => {
      if (resolveWait) {
        resolveWait();
        resolveWait = null;
      }
    };
    
    try {
      for await (const value of iterable) {
        const now = Date.now();
        const timeSinceLastEmit = now - lastEmitTime;
        
        // If we're past the throttle window, emit immediately
        if (timeSinceLastEmit >= ms) {
          if (leading) {
            yield value;
            lastEmitTime = now;
          } else {
            pendingValue = value;
          }
          continue;
        }
        
        // Otherwise, store the value for potential trailing emission
        pendingValue = value;
        
        // If we're not already waiting, start the throttle timer
        if (!isThrottleActive) {
          isThrottleActive = true;
          
          try {
            await waitForThrottle();
            
            // After waiting, emit the trailing value if available
            if (pendingValue !== undefined && trailing) {
              const emittedValue = processPending();
              if (emittedValue !== undefined) {
                yield emittedValue;
              }
            }
          } finally {
            isThrottleActive = false;
          }
        }
      }
      
      // Source is done, handle any trailing emission
      isSourceDone = true;
      if (trailing && pendingValue !== undefined) {
        const emittedValue = processPending();
        if (emittedValue !== undefined) {
          yield emittedValue;
        }
      }
    } finally {
      // Cleanup on early return/cancel
      cleanup();
    }
  };
}

export function timeout(ms, { error } = {}) {
  if (ms <= 0) throw new RangeError('ms must be > 0');
  const err = error || new Error('Timeout');
  const TOKEN = Symbol('timeout');
  return async function* (iterable) {
    const iterator = iterable[Symbol.asyncIterator]();
    while (true) {
      const nextP = iterator.next();
      const timerP = new Promise((resolve) => setTimeout(() => resolve(TOKEN), ms));
      const res = await Promise.race([nextP, timerP]);
      if (res === TOKEN) throw err;
      if (res && typeof res === 'object' && 'done' in res) {
        if (res.done) return;
        yield res.value;
      }
    }
  };
}

/**
 * Creates an async iterable that merges values from multiple async iterables.
 * Values are emitted as soon as they're available from any source.
 * @param {...AsyncIterable} iterables - The iterables to merge
 * @returns {AsyncIterable} A new async iterable that yields values from all sources
 */
export async function* merge(...iterables) {
  // Support both (iterable, ...iterables) and (...iterables) signatures
  const sources = iterables.length === 1 && iterables[0] && typeof iterables[0][Symbol.asyncIterator] === 'function' 
    ? iterables[0] 
    : iterables;

  const iterators = [];
  const active = new Set();
  const errors = [];
  let error = null;

  try {
    // Create iterators for all sources
    for (const source of sources) {
      if (!source || typeof source[Symbol.asyncIterator] !== 'function') {
        throw new ValidationError('All arguments must be async iterable');
      }
      const it = source[Symbol.asyncIterator]();
      iterators.push(it);
      active.add(it);
    }

    // Start with all iterators
    const nextPromises = new Map(
      iterators.map(it => [it, it.next().catch(e => { throw e; })])
    );

    while (active.size > 0 && !error) {
      // Wait for at least one iterator to have a value
      const result = await Promise.race(
        Array.from(active).map(async (it) => {
          try {
            const value = await nextPromises.get(it);
            return { it, value };
          } catch (e) {
            return { it, error: e };
          }
        })
      );

      const { it, value, error: iterError } = result;

      if (iterError) {
        errors.push(iterError);
        active.delete(it);
        nextPromises.delete(it);
        continue;
      }

      if (value.done) {
        // Iterator is done
        active.delete(it);
        nextPromises.delete(it);
      } else {
        // Queue up the next value for this iterator
        nextPromises.set(it, it.next().catch(e => { throw e; }));
        
        // Yield the current value
        yield value.value;
      }
    }

    // If we have errors, throw the first one
    if (errors.length > 0) {
      throw errors[0];
    }
  } finally {
    // Clean up all iterators
    await Promise.allSettled(
      iterators.map(it => it.return?.())
    );
  }
}

/**
 * Creates an async iterable that combines values from multiple async iterables into arrays.
 * The resulting iterable completes when any of the source iterables complete.
 * @param {...AsyncIterable} iterables - The iterables to zip together
 * @returns {AsyncIterable} A new async iterable that yields arrays of values
 */
export async function* zip(...iterables) {
  // Support both (iterable, ...iterables) and (...iterables) signatures
  const sources = iterables.length === 1 && iterables[0] && typeof iterables[0][Symbol.asyncIterator] === 'function'
    ? iterables[0]
    : iterables;

  const iterators = [];
  const errors = [];
  let isDone = false;

  try {
    // Create iterators for all sources
    for (const source of sources) {
      if (!source || typeof source[Symbol.asyncIterator] !== 'function') {
        throw new ValidationError('All arguments must be async iterable');
      }
      iterators.push(source[Symbol.asyncIterator]());
    }

    while (!isDone) {
      // Get next value from each iterator
      const nextPromises = iterators.map((it, index) => 
        it.next().catch(error => ({ error, index }))
      );

      // Wait for all iterators to produce a value or error
      const results = await Promise.all(nextPromises);

      // Check for errors
      const errorResult = results.find(r => r && 'error' in r);
      if (errorResult) {
        errors.push(errorResult.error);
        break;
      }

      // Check if any iterator is done
      const anyDone = results.some(r => r.done);
      const allDone = results.every(r => r.done);

      if (anyDone) {
        if (!allDone) {
          errors.push(new Error('All iterables must be the same length'));
        }
        isDone = true;
        break;
      }

      // Yield the current values
      yield results.map(r => r.value);
    }

    // If we have errors, throw the first one
    if (errors.length > 0) {
      throw errors[0];
    }
  } finally {
    // Clean up all iterators
    await Promise.allSettled(
      iterators.map(it => it.return?.())
    );
  }
}

// Export all named exports in a single statement
export {
  // Core functions
  fromEventTarget,
  fromEventEmitter,
  toEventEmitter,
  toAsyncIterable,
  
  // Operators
  map,
  filter,
  take,
  buffer,
  pipe,
  retryIterable,
  scan,
  distinctUntilChanged,
  debounceTime,
  throttleTime,
  timeout,
  merge,
  zip,
  withQueue,
  
  // Constants
  QUEUE_POLICIES
};

// Default export for backward compatibility
const mainExports = {
  // Core functions
  fromEventTarget,
  fromEventEmitter,
  toEventEmitter,
  toAsyncIterable,
  
  // Operators
  map,
  filter,
  take,
  buffer,
  pipe,
  retryIterable,
  scan,
  distinctUntilChanged,
  debounceTime,
  throttleTime,
  timeout,
  merge,
  zip,
  withQueue,
  
  // Constants
  QUEUE_POLICIES,
  
  // Error classes
  UniconnectError,
  AbortError,
  QueueOverflowError,
  ValidationError,
  NotSupportedError
};

export default mainExports;
