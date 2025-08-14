/**
 * Utility functions for working with event streams, files, and environment detection
 */

import { EventStream } from '../types';
import { EventStreamImpl } from '../event-stream';

export * from './file-utils';
export * from './env-utils';

/**
 * Creates a promise that resolves with the next value from the stream
 * @param stream The event stream to listen to
 * @param timeoutMs Optional timeout in milliseconds
 * @returns A promise that resolves with the next value or rejects on timeout
 */
export function nextValue<T>(
  stream: EventStream<T>,
  timeoutMs: number = 0
): Promise<T> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const unsubscribe = stream.subscribe((value) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
      resolve(value);
    });

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for next value after ${timeoutMs}ms`));
      }, timeoutMs);
    }
  });
}

/**
 * Collects all values from a stream into an array
 * @param stream The event stream to collect values from
 * @param count Optional maximum number of values to collect
 * @returns A promise that resolves with the collected values
 */
export function collect<T>(
  source: EventStream<T>,
  count: number = Infinity
): Promise<T[]> {
  return new Promise((resolve) => {
    const values: T[] = [];
    
    if (count <= 0) {
      resolve(values);
      return;
    }
    
    const unsubscribe = source.subscribe((value) => {
      values.push(value);
      
      if (values.length >= count) {
        unsubscribe();
        resolve(values);
      }
    });
    
    // Handle the case where the source completes before emitting enough values
    const originalComplete = source.complete.bind(source);
    source.complete = () => {
      originalComplete();
      if (values.length > 0) {
        resolve(values);
      }
      return source;
    };
  });
}

/**
 * Creates a stream that emits values at a fixed interval
 * @param intervalMs Interval in milliseconds
 * @param startValue Optional starting value (default: 0)
 * @param increment Optional increment value (default: 1)
 * @returns A new event stream that emits values at the specified interval
 */
export function interval(
  intervalMs: number,
  startValue: number = 0,
  increment: number = 1
): EventStream<number> {
  return new (class extends EventStreamImpl<number> {
    private timerId: ReturnType<typeof setInterval> | null = null;
    private value = startValue;
    private isActive = false;

    constructor() {
      super();
      this.isActive = true;
      this.timerId = setInterval(() => {
        if (!this.isActive) return;
        this.emit(this.value);
        this.value += increment;
      }, intervalMs);
    }

    subscribe(listener: (value: number) => void): () => void {
      const unsubscribe = super.subscribe(listener);
      
      return () => {
        unsubscribe();
        if (!this.hasListeners() && this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
        }
      };
    }

    complete(): void {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
      this.isActive = false;
      super.complete();
    }
  })();
}

/**
 * Creates a stream from an array of values
 * @param values Array of values to emit
 * @returns A new event stream that emits each value in the array
 */
export function fromArray<T>(values: T[]): EventStream<T> {
  return new (class extends EventStreamImpl<T> {
    private isCompleted = false;
    private isEmitting = false;

    constructor() {
      super();
      // Emit values in the next tick to allow for subscription
      Promise.resolve().then(() => {
        if (this.isCompleted || this.isEmitting) return;
        
        this.isEmitting = true;
        try {
          for (let i = 0; i < values.length; i++) {
            if (this.isCompleted) break;
            this.emit(values[i]);
          }
        } finally {
          this.isEmitting = false;
          if (!this.isCompleted) {
            this.complete();
          }
        }
      });
    }

    subscribe(listener: (value: T) => void): () => void {
      if (this.isCompleted) {
        return () => {};
      }
      
      return super.subscribe(listener);
    }

    complete(): void {
      if (this.isCompleted) return;
      this.isCompleted = true;
      super.complete();
    }
  })();
}
