/**
 * Advanced memory management utilities for high-performance applications
 * Provides automatic memory monitoring, cleanup, and optimization strategies
 */

export interface MemoryConfig {
  /**
   * Memory pressure threshold (percentage of heap used)
   * @default 0.8 (80%)
   */
  pressureThreshold?: number;

  /**
   * Interval for memory monitoring in milliseconds
   * @default 5000 (5 seconds)
   */
  monitoringInterval?: number;

  /**
   * Whether to enable automatic cleanup on memory pressure
   * @default true
   */
  autoCleanup?: boolean;

  /**
   * Whether to log memory statistics
   * @default false
   */
  enableLogging?: boolean;
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapUsedPercent: number;
  external: number;
  rss: number;
  timestamp: number;
}

/**
 * Memory manager that monitors heap usage and triggers cleanup when needed
 */
export class MemoryManager {
  private readonly config: Required<MemoryConfig>;
  private monitoringTimer?: NodeJS.Timeout;
  private cleanupHandlers: (() => void)[] = [];
  private weakRefs: WeakRef<object>[] = [];
  private lastStats?: MemoryStats;
  private pressureCallbacks: ((stats: MemoryStats) => void)[] = [];

  constructor(config: MemoryConfig = {}) {
    this.config = {
      pressureThreshold: config.pressureThreshold ?? 0.8,
      monitoringInterval: config.monitoringInterval ?? 5000,
      autoCleanup: config.autoCleanup ?? true,
      enableLogging: config.enableLogging ?? false
    };

    this.startMonitoring();
  }

  /**
   * Get current memory statistics
   */
  getStats(): MemoryStats {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        heapUsedPercent: usage.heapUsed / usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
        timestamp: Date.now()
      };
    }

    // Browser fallback with estimated values
    const estimated = this.estimateBrowserMemory();
    return {
      heapUsed: estimated,
      heapTotal: estimated * 2, // Rough estimate
      heapUsedPercent: 0.5, // Conservative estimate
      external: 0,
      rss: estimated,
      timestamp: Date.now()
    };
  }

  /**
   * Register a cleanup handler to be called during memory pressure
   * @param handler Cleanup function
   * @returns Function to unregister the handler
   */
  onCleanup(handler: () => void): () => void {
    this.cleanupHandlers.push(handler);
    return () => {
      const index = this.cleanupHandlers.indexOf(handler);
      if (index !== -1) {
        this.cleanupHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for memory pressure events
   * @param callback Function to call when memory pressure is detected
   * @returns Function to unregister the callback
   */
  onMemoryPressure(callback: (stats: MemoryStats) => void): () => void {
    this.pressureCallbacks.push(callback);
    return () => {
      const index = this.pressureCallbacks.indexOf(callback);
      if (index !== -1) {
        this.pressureCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Track an object for automatic cleanup using WeakRef
   * @param obj Object to track
   */
  track<T extends object>(obj: T): T {
    this.weakRefs.push(new WeakRef(obj));
    return obj;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Manually trigger cleanup
   */
  cleanup(): void {
    // Run all cleanup handlers
    this.cleanupHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        if (this.config.enableLogging) {
          console.warn('Memory cleanup handler error:', error);
        }
      }
    });

    // Clean up dead weak references
    this.cleanupWeakRefs();

    // Force GC if available
    this.forceGC();
  }

  /**
   * Stop memory monitoring
   */
  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    this.cleanupHandlers.length = 0;
    this.pressureCallbacks.length = 0;
    this.weakRefs.length = 0;
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      const stats = this.getStats();
      this.lastStats = stats;

      if (this.config.enableLogging) {
        this.logStats(stats);
      }

      // Check for memory pressure
      if (stats.heapUsedPercent > this.config.pressureThreshold) {
        this.handleMemoryPressure(stats);
      }
    }, this.config.monitoringInterval);
  }

  private handleMemoryPressure(stats: MemoryStats): void {
    if (this.config.enableLogging) {
      console.warn(
        `Memory pressure detected: ${(stats.heapUsedPercent * 100).toFixed(1)}% heap used`
      );
    }

    // Notify pressure callbacks
    this.pressureCallbacks.forEach(callback => {
      try {
        callback(stats);
      } catch (error) {
        if (this.config.enableLogging) {
          console.warn('Memory pressure callback error:', error);
        }
      }
    });

    // Auto cleanup if enabled
    if (this.config.autoCleanup) {
      this.cleanup();
    }
  }

  private cleanupWeakRefs(): void {
    const before = this.weakRefs.length;
    this.weakRefs = this.weakRefs.filter(ref => ref.deref() !== undefined);
    const cleaned = before - this.weakRefs.length;
    
    if (this.config.enableLogging && cleaned > 0) {
      console.debug(`MemoryManager: Cleaned up ${cleaned} dead references`);
    }
  }

  private logStats(stats: MemoryStats): void {
    console.log(
      `Memory: ${(stats.heapUsed / 1024 / 1024).toFixed(1)}MB / ` +
      `${(stats.heapTotal / 1024 / 1024).toFixed(1)}MB ` +
      `(${(stats.heapUsedPercent * 100).toFixed(1)}%)`
    );
  }

  private estimateBrowserMemory(): number {
    // Rough browser memory estimation
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 50 * 1024 * 1024; // 50MB fallback
    }
    return 50 * 1024 * 1024; // 50MB fallback
  }
}

// Global memory manager instance
let globalMemoryManager: MemoryManager | null = null;

/**
 * Get or create the global memory manager instance
 * @param config Configuration options (only used for initial creation)
 * @returns Global MemoryManager instance
 */
export function getMemoryManager(config?: MemoryConfig): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager(config);
  }
  return globalMemoryManager;
}

/**
 * Helper function to create a memory-efficient event processor
 * @param processFn Function to process events
 * @param maxMemoryMB Maximum memory usage in MB before triggering cleanup
 * @returns Wrapped processor with memory management
 */
export function withMemoryManagement<T, R>(
  processFn: (item: T) => R,
  maxMemoryMB: number = 100
): (item: T) => R | null {
  const manager = getMemoryManager({ enableLogging: true });
  const maxBytes = maxMemoryMB * 1024 * 1024;

  return (item: T): R | null => {
    const stats = manager.getStats();
    
    if (stats.heapUsed > maxBytes) {
      manager.cleanup();
      
      // Check again after cleanup
      const newStats = manager.getStats();
      if (newStats.heapUsed > maxBytes) {
        return null; // Skip processing to prevent memory issues
      }
    }

    return processFn(item);
  };
}
