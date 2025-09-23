/**
 * Advanced batch processing operators for EventStreams
 * Provides efficient batching strategies for high-throughput scenarios
 */

import { EventStream } from '../types';
import { EventStreamImpl } from '../event-stream';

export interface BatchOptions {
  /**
   * Maximum number of items in a batch
   * @default 100
   */
  maxSize?: number;

  /**
   * Maximum time to wait before emitting a partial batch (in milliseconds)
   * @default 1000
   */
  maxWaitMs?: number;

  /**
   * Minimum batch size before emitting (unless timeout occurs)
   * @default 1
   */
  minSize?: number;

  /**
   * Whether to emit the final batch even if it's smaller than minSize
   * @default true
   */
  emitPartialBatch?: boolean;
}

export interface WindowOptions {
  /**
   * Window size (number of items)
   */
  size: number;

  /**
   * Step size (how many items to advance the window)
   * @default size (non-overlapping windows)
   */
  step?: number;

  /**
   * Whether to emit partial windows at the end
   * @default false
   */
  emitPartialWindow?: boolean;
}

/**
 * Batch operator that collects items into arrays based on size and/or time
 * @param source Source event stream
 * @param options Batching configuration
 * @returns EventStream that emits arrays of batched items
 */
export function batch<T>(
  source: EventStream<T>,
  options: BatchOptions = {}
): EventStream<T[]> {
  const {
    maxSize = 100,
    maxWaitMs = 1000,
    minSize = 1,
    emitPartialBatch = true
  } = options;

  return new (class extends EventStreamImpl<T[]> {
    private currentBatch: T[] = [];
    private timeoutId?: NodeJS.Timeout;
    private sourceUnsubscribe?: () => void;

    constructor() {
      super();
      this.setupSource();
    }

    private setupSource(): void {
      this.sourceUnsubscribe = source.subscribe((item) => {
        this.currentBatch.push(item);

        // Emit if we reached max size
        if (this.currentBatch.length >= maxSize) {
          this.emitBatch();
        } else if (this.currentBatch.length === 1) {
          // Start timeout on first item
          this.startTimeout();
        }
      });

      // Handle source completion
      const originalComplete = source.complete.bind(source);
      source.complete = () => {
        originalComplete();
        this.handleSourceComplete();
        return source;
      };
    }

    private startTimeout(): void {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        if (this.currentBatch.length >= minSize || emitPartialBatch) {
          this.emitBatch();
        }
      }, maxWaitMs);
    }

    private emitBatch(): void {
      if (this.currentBatch.length > 0) {
        const batch = [...this.currentBatch];
        this.currentBatch = [];
        
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = undefined;
        }
        
        this.emit(batch);
      }
    }

    private handleSourceComplete(): void {
      if (this.currentBatch.length > 0 && emitPartialBatch) {
        this.emitBatch();
      }
      this.complete();
    }

    complete(): EventStream<T[]> {
      if (this.sourceUnsubscribe) {
        this.sourceUnsubscribe();
      }
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      return super.complete();
    }
  })();
}

/**
 * Sliding window operator that emits arrays of fixed-size windows
 * @param source Source event stream
 * @param options Window configuration
 * @returns EventStream that emits arrays representing windows
 */
export function slidingWindow<T>(
  source: EventStream<T>,
  options: WindowOptions
): EventStream<T[]> {
  const { size, step = size, emitPartialWindow = false } = options;

  return new (class extends EventStreamImpl<T[]> {
    private buffer: T[] = [];
    private sourceUnsubscribe?: () => void;

    constructor() {
      super();
      this.setupSource();
    }

    private setupSource(): void {
      this.sourceUnsubscribe = source.subscribe((item) => {
        this.buffer.push(item);

        // Emit window if we have enough items
        if (this.buffer.length >= size) {
          this.emit([...this.buffer.slice(0, size)]);
          
          // Advance buffer by step size
          this.buffer = this.buffer.slice(step);
        }
      });

      // Handle source completion
      const originalComplete = source.complete.bind(source);
      source.complete = () => {
        originalComplete();
        this.handleSourceComplete();
        return source;
      };
    }

    private handleSourceComplete(): void {
      if (emitPartialWindow && this.buffer.length > 0) {
        this.emit([...this.buffer]);
      }
      this.complete();
    }

    complete(): EventStream<T[]> {
      if (this.sourceUnsubscribe) {
        this.sourceUnsubscribe();
      }
      return super.complete();
    }
  })();
}

/**
 * Debounce operator that emits only after a specified delay with no new items
 * @param source Source event stream
 * @param delayMs Delay in milliseconds
 * @returns EventStream that emits debounced values
 */
export function debounce<T>(
  source: EventStream<T>,
  delayMs: number
): EventStream<T> {
  return new (class extends EventStreamImpl<T> {
    private timeoutId?: NodeJS.Timeout;
    private lastValue?: T;
    private sourceUnsubscribe?: () => void;

    constructor() {
      super();
      this.setupSource();
    }

    private setupSource(): void {
      this.sourceUnsubscribe = source.subscribe((item) => {
        this.lastValue = item;
        
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }
        
        this.timeoutId = setTimeout(() => {
          if (this.lastValue !== undefined) {
            this.emit(this.lastValue);
            this.lastValue = undefined;
          }
        }, delayMs);
      });

      // Handle source completion
      const originalComplete = source.complete.bind(source);
      source.complete = () => {
        originalComplete();
        this.handleSourceComplete();
        return source;
      };
    }

    private handleSourceComplete(): void {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        
        // Emit final value if exists
        if (this.lastValue !== undefined) {
          this.emit(this.lastValue);
        }
      }
      this.complete();
    }

    complete(): EventStream<T> {
      if (this.sourceUnsubscribe) {
        this.sourceUnsubscribe();
      }
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      return super.complete();
    }
  })();
}
