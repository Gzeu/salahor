/**
 * High-Performance Event Stream with Advanced Optimizations
 * Implements object pooling, batching, and memory-efficient operations
 */

import { EventListener, EventStream, Operator, Subscriber, Unsubscribe } from '../types';
import { TokenBucketRateLimiter, RateLimiterConfig } from '../security/rate-limiter';

export interface PerformanceMetrics {
  totalEvents: number;
  avgProcessingTime: number;
  peakMemoryUsage: number;
  listenerCount: number;
  errorCount: number;
  lastError?: Error;
}

export interface OptimizedEventStreamConfig {
  /** Enable object pooling for better memory management */
  enablePooling?: boolean;
  /** Maximum pool size for reusable objects */
  maxPoolSize?: number;
  /** Enable batching for high-frequency events */
  enableBatching?: boolean;
  /** Batch size for event processing */
  batchSize?: number;
  /** Batch timeout in milliseconds */
  batchTimeout?: number;
  /** Enable performance metrics collection */
  collectMetrics?: boolean;
  /** Rate limiting configuration */
  rateLimiting?: RateLimiterConfig;
  /** Maximum number of listeners before warning */
  maxListeners?: number;
  /** Enable WeakRef for memory-efficient listener management */
  useWeakRefs?: boolean;
}

/**
 * Object pool for reusing event objects and reducing garbage collection
 */
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, maxSize = 100, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn?.(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Batch processor for high-frequency events
 */
class BatchProcessor<T> {
  private batch: T[] = [];
  private timeoutId?: NodeJS.Timeout;
  private readonly batchSize: number;
  private readonly timeout: number;
  private readonly processor: (batch: T[]) => void;

  constructor(batchSize: number, timeout: number, processor: (batch: T[]) => void) {
    this.batchSize = batchSize;
    this.timeout = timeout;
    this.processor = processor;
  }

  add(item: T): void {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.timeout);
    }
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    if (this.batch.length > 0) {
      const currentBatch = this.batch.slice();
      this.batch.length = 0;
      this.processor(currentBatch);
    }
  }

  destroy(): void {
    this.flush();
    this.batch.length = 0;
  }
}

export class OptimizedEventStream<T> implements EventStream<T> {
  private listeners: Set<EventListener<T> | Subscriber<T>> | Set<WeakRef<EventListener<T> | Subscriber<T>>> = new Set();
  private completed: boolean = false;
  private readonly config: Required<OptimizedEventStreamConfig>;
  private readonly rateLimiter?: TokenBucketRateLimiter;
  private readonly batchProcessor?: BatchProcessor<{ event: T; timestamp: number }>;
  private readonly objectPool?: ObjectPool<{ event: T; timestamp: number }>;
  private readonly metrics: PerformanceMetrics;
  private readonly performanceObserver?: PerformanceObserver;

  constructor(config: OptimizedEventStreamConfig = {}) {
    this.config = {
      enablePooling: config.enablePooling ?? true,
      maxPoolSize: config.maxPoolSize ?? 100,
      enableBatching: config.enableBatching ?? false,
      batchSize: config.batchSize ?? 10,
      batchTimeout: config.batchTimeout ?? 16, // ~60fps
      collectMetrics: config.collectMetrics ?? false,
      maxListeners: config.maxListeners ?? 100,
      useWeakRefs: config.useWeakRefs ?? false,
      ...config
    };

    this.metrics = {
      totalEvents: 0,
      avgProcessingTime: 0,
      peakMemoryUsage: 0,
      listenerCount: 0,
      errorCount: 0
    };

    if (this.config.rateLimiting) {
      this.rateLimiter = new TokenBucketRateLimiter(this.config.rateLimiting);
    }

    if (this.config.enablePooling) {
      this.objectPool = new ObjectPool(
        () => ({ event: undefined as any, timestamp: 0 }),
        this.config.maxPoolSize,
        (obj) => {
          obj.event = undefined as any;
          obj.timestamp = 0;
        }
      );
    }

    if (this.config.enableBatching) {
      this.batchProcessor = new BatchProcessor(
        this.config.batchSize,
        this.config.batchTimeout,
        (batch) => this.processBatch(batch)
      );
    }

    if (this.config.collectMetrics && typeof PerformanceObserver !== 'undefined') {
      this.setupPerformanceObserver();
    }
  }

  private setupPerformanceObserver(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.name === 'event-processing') {
            this.updateProcessingMetrics(entry.duration);
          }
        }
      });
      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      // PerformanceObserver not available in this environment
    }
  }

  private updateProcessingMetrics(duration: number): void {
    const count = this.metrics.totalEvents;
    this.metrics.avgProcessingTime = (this.metrics.avgProcessingTime * count + duration) / (count + 1);
  }

  subscribe(listener: EventListener<T> | Subscriber<T>): Unsubscribe {
    if (this.completed) {
      if (typeof listener === 'object' && listener.complete) {
        queueMicrotask(() => {
          try {
            listener.complete?.();
          } catch (error) {
            this.handleError(error);
          }
        });
      }
      return () => {};
    }

    // Check listener limit
    if (this.listeners.size >= this.config.maxListeners) {
      console.warn(`Event stream has reached maximum listeners (${this.config.maxListeners})`);
    }

    if (this.config.useWeakRefs) {
      const weakRef = new WeakRef(listener);
      (this.listeners as Set<WeakRef<EventListener<T> | Subscriber<T>>>).add(weakRef);
      
      return () => {
        (this.listeners as Set<WeakRef<EventListener<T> | Subscriber<T>>>).delete(weakRef);
        this.cleanupWeakRefs();
      };
    } else {
      (this.listeners as Set<EventListener<T> | Subscriber<T>>).add(listener);
      
      return () => {
        (this.listeners as Set<EventListener<T> | Subscriber<T>>).delete(listener);
      };
    }
  }

  private cleanupWeakRefs(): void {
    if (!this.config.useWeakRefs) return;
    
    const listeners = this.listeners as Set<WeakRef<EventListener<T> | Subscriber<T>>>;
    const toRemove: WeakRef<EventListener<T> | Subscriber<T>>[] = [];
    
    for (const weakRef of listeners) {
      if (!weakRef.deref()) {
        toRemove.push(weakRef);
      }
    }
    
    toRemove.forEach(ref => listeners.delete(ref));
  }

  emit(event: T): void {
    if (this.completed) return;

    // Apply rate limiting if configured
    if (this.rateLimiter) {
      const result = this.rateLimiter.consume();
      if (!result.allowed) {
        console.warn('Event dropped due to rate limiting');
        return;
      }
    }

    this.metrics.totalEvents++;

    if (this.config.enableBatching && this.batchProcessor) {
      const eventObj = this.config.enablePooling && this.objectPool
        ? this.objectPool.acquire()
        : { event: undefined as any, timestamp: 0 };
      
      eventObj.event = event;
      eventObj.timestamp = Date.now();
      
      this.batchProcessor.add(eventObj);
    } else {
      this.processEvent(event);
    }
  }

  private processBatch(batch: { event: T; timestamp: number }[]): void {
    const startTime = performance.now();
    
    try {
      for (const item of batch) {
        this.processEvent(item.event);
        
        if (this.config.enablePooling && this.objectPool) {
          this.objectPool.release(item);
        }
      }
    } finally {
      if (this.config.collectMetrics) {
        const duration = performance.now() - startTime;
        performance.mark('batch-end');
        performance.measure('event-processing', { start: startTime, end: performance.now() });
      }
    }
  }

  private processEvent(event: T): void {
    const listeners = this.getActiveListeners();
    
    for (const listener of listeners) {
      try {
        if (typeof listener === 'function') {
          const result = listener(event);
          if (this.isPromise(result)) {
            result.catch((error) => this.handleError(error));
          }
        } else if (listener.next) {
          const result = listener.next(event);
          if (this.isPromise(result)) {
            result.catch((error) => {
              this.handleError(error);
              listener.error?.(error instanceof Error ? error : new Error(String(error)));
            });
          }
        }
      } catch (error) {
        this.handleError(error);
        if (typeof listener === 'object' && listener.error) {
          try {
            listener.error(error instanceof Error ? error : new Error(String(error)));
          } catch (err) {
            this.handleError(err);
          }
        }
      }
    }
  }

  private getActiveListeners(): (EventListener<T> | Subscriber<T>)[] {
    if (this.config.useWeakRefs) {
      const listeners = this.listeners as Set<WeakRef<EventListener<T> | Subscriber<T>>>;
      const active: (EventListener<T> | Subscriber<T>)[] = [];
      
      for (const weakRef of listeners) {
        const listener = weakRef.deref();
        if (listener) {
          active.push(listener);
        }
      }
      
      return active;
    } else {
      return Array.from(this.listeners as Set<EventListener<T> | Subscriber<T>>);
    }
  }

  private isPromise(value: any): value is Promise<unknown> {
    return value && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
  }

  private handleError(error: any): void {
    this.metrics.errorCount++;
    this.metrics.lastError = error instanceof Error ? error : new Error(String(error));
    console.error('Event stream error:', error);
  }

  complete(): void {
    if (this.completed) return;
    
    this.completed = true;
    
    // Flush any pending batches
    this.batchProcessor?.flush();
    
    const listeners = this.getActiveListeners();
    this.listeners.clear();
    
    for (const listener of listeners) {
      try {
        if (typeof listener === 'function') {
          listener(undefined as any);
        } else if (listener.complete) {
          listener.complete();
        }
      } catch (error) {
        this.handleError(error);
      }
    }
    
    // Cleanup resources
    this.performanceObserver?.disconnect();
    this.batchProcessor?.destroy();
    this.objectPool?.clear();
  }

  pipe<U = T>(...operators: Operator<any, any>[]): EventStream<U> {
    return operators.reduce(
      (source, operator) => operator(source),
      this as unknown as EventStream<any>
    ) as EventStream<U>;
  }

  /**
   * Gets performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.metrics.listenerCount = this.listeners.size;
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, memUsage.heapUsed);
    }
    
    return { ...this.metrics };
  }

  /**
   * Resets performance metrics
   */
  resetMetrics(): void {
    this.metrics.totalEvents = 0;
    this.metrics.avgProcessingTime = 0;
    this.metrics.peakMemoryUsage = 0;
    this.metrics.errorCount = 0;
    this.metrics.lastError = undefined;
  }
}

export function createOptimizedEventStream<T = any>(config?: OptimizedEventStreamConfig): OptimizedEventStream<T> {
  return new OptimizedEventStream<T>(config);
}
