/**
 * Type definitions for OptimizedWorkerPool
 * @module workers/OptimizedWorkerPool
 */

declare type WorkerStates = 'idle' | 'busy' | 'terminating' | 'terminated';

declare interface WorkerData {
  worker: Worker;
  state: WorkerStates;
  lastUsed: number;
  currentTask: {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    startedAt: number;
  } | null;
}

declare interface WorkerPoolOptions {
  /** Minimum number of workers to keep alive */
  minWorkers?: number;
  
  /** Maximum number of workers that can be created */
  maxWorkers?: number;
  
  /** Time in ms after which an idle worker will be terminated */
  idleTimeout?: number;
  
  /** Maximum number of tasks that can be queued */
  maxQueueSize?: number;
  
  /** Options to pass to the Worker constructor */
  workerOptions?: WorkerOptions;
  
  /** Callback when a new worker is created */
  onWorkerCreated?: (workerId: string) => void;
  
  /** Callback when a worker is terminated */
  onWorkerTerminated?: (workerId: string, code: number) => void;
}

declare interface WorkerPoolStats {
  /** Total number of workers */
  total: number;
  
  /** Number of idle workers */
  idle: number;
  
  /** Number of busy workers */
  busy: number;
  
  /** Number of workers that are terminating */
  terminating: number;
  
  /** Number of workers that have terminated */
  terminated: number;
  
  /** Number of queued tasks */
  queued: number;
}

/**
 * A pool of worker threads for parallel task execution
 */
declare class OptimizedWorkerPool {
  /**
   * Create a new OptimizedWorkerPool
   * @param workerScript - Path to worker script or a function to run in the worker
   * @param options - Pool configuration options
   */
  constructor(
    workerScript: string | Function,
    options?: WorkerPoolOptions
  );

  /**
   * Execute a task in the worker pool
   * @param task - Task data to send to the worker
   * @param transferList - Optional list of transferable objects
   * @returns A promise that resolves with the worker's response
   */
  execute<T = any, R = any>(
    task: T,
    transferList?: ArrayBuffer[] | MessagePort[]
  ): Promise<R>;

  /**
   * Get current pool statistics
   */
  getStats(): WorkerPoolStats;

  /**
   * Terminate all workers and clean up
   * @param force - If true, force immediate termination
   */
  terminate(force?: boolean): Promise<void>;
}

export default OptimizedWorkerPool;
