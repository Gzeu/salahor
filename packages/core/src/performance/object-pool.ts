/**
 * High-performance object pooling for memory optimization
 * Reduces garbage collection pressure and improves performance
 */

export interface ObjectPoolOptions<T> {
  /**
   * Factory function to create new objects
   */
  factory: () => T;

  /**
   * Function to reset/clean an object before reuse
   * @param obj Object to reset
   */
  reset?: (obj: T) => void;

  /**
   * Maximum number of objects to keep in the pool
   * @default 10
   */
  maxSize?: number;

  /**
   * Minimum number of objects to keep in the pool
   * @default 0
   */
  minSize?: number;

  /**
   * Time in milliseconds before unused objects are cleaned up
   * @default 60000 (1 minute)
   */
  ttlMs?: number;

  /**
   * Whether to pre-fill the pool with minimum objects
   * @default true
   */
  preFill?: boolean;
}

interface PooledObject<T> {
  object: T;
  lastUsed: number;
  inUse: boolean;
}

/**
 * Generic object pool implementation with automatic cleanup
 */
export class ObjectPool<T> {
  private readonly factory: () => T;
  private readonly reset?: (obj: T) => void;
  private readonly maxSize: number;
  private readonly minSize: number;
  private readonly ttlMs: number;
  private readonly pool: PooledObject<T>[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: ObjectPoolOptions<T>) {
    this.factory = options.factory;
    this.reset = options.reset;
    this.maxSize = options.maxSize ?? 10;
    this.minSize = options.minSize ?? 0;
    this.ttlMs = options.ttlMs ?? 60000;

    if (options.preFill !== false) {
      this.preFill();
    }

    this.startCleanupTimer();
  }

  /**
   * Acquire an object from the pool
   * @returns Object from pool or newly created object
   */
  acquire(): T {
    // Find an available object in the pool
    const pooledObject = this.pool.find(item => !item.inUse);

    if (pooledObject) {
      pooledObject.inUse = true;
      pooledObject.lastUsed = Date.now();
      
      if (this.reset) {
        this.reset(pooledObject.object);
      }
      
      return pooledObject.object;
    }

    // No available objects, create new one
    const newObject = this.factory();
    
    // Add to pool if not at capacity
    if (this.pool.length < this.maxSize) {
      this.pool.push({
        object: newObject,
        lastUsed: Date.now(),
        inUse: true
      });
    }

    return newObject;
  }

  /**
   * Release an object back to the pool
   * @param obj Object to release
   */
  release(obj: T): void {
    const pooledObject = this.pool.find(item => item.object === obj);
    
    if (pooledObject) {
      pooledObject.inUse = false;
      pooledObject.lastUsed = Date.now();
    }
  }

  /**
   * Get current pool statistics
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    minSize: number;
    maxSize: number;
  } {
    const inUse = this.pool.filter(item => item.inUse).length;
    
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse,
      minSize: this.minSize,
      maxSize: this.maxSize
    };
  }

  /**
   * Clear all objects from the pool
   */
  clear(): void {
    this.pool.length = 0;
  }

  /**
   * Destroy the pool and stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  private preFill(): void {
    for (let i = 0; i < this.minSize; i++) {
      this.pool.push({
        object: this.factory(),
        lastUsed: Date.now(),
        inUse: false
      });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.ttlMs / 2); // Run cleanup twice per TTL period
  }

  private cleanup(): void {
    const now = Date.now();
    const beforeCleanup = this.pool.length;
    
    // Remove expired objects that aren't in use
    const filtered = this.pool.filter(item => {
      if (item.inUse) {
        return true; // Keep objects that are in use
      }
      
      const isExpired = (now - item.lastUsed) > this.ttlMs;
      const canRemove = this.pool.length > this.minSize;
      
      return !(isExpired && canRemove);
    });
    
    this.pool.length = 0;
    this.pool.push(...filtered);
    
    const cleaned = beforeCleanup - this.pool.length;
    if (cleaned > 0) {
      // Optional: emit cleanup event for monitoring
      // console.debug(`ObjectPool: Cleaned up ${cleaned} expired objects`);
    }
  }
}

/**
 * Create a pooled version of a factory function
 * @param factory Function that creates expensive objects
 * @param options Pool configuration options
 * @returns Functions to acquire and release pooled objects
 */
export function createObjectPool<T>(
  factory: () => T,
  options: Omit<ObjectPoolOptions<T>, 'factory'> = {}
): {
  acquire: () => T;
  release: (obj: T) => void;
  getStats: () => ReturnType<ObjectPool<T>['getStats']>;
  destroy: () => void;
} {
  const pool = new ObjectPool({ ...options, factory });

  return {
    acquire: () => pool.acquire(),
    release: (obj: T) => pool.release(obj),
    getStats: () => pool.getStats(),
    destroy: () => pool.destroy()
  };
}
