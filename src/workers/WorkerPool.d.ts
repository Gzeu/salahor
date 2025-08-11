import { EventEmitter } from 'events';

declare type WorkerType = Worker | any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface WorkerPoolOptions {
  minWorkers?: number;
  maxWorkers?: number;
  idleTimeout?: number;
  maxQueueSize?: number;
  workerOptions?: Record<string, unknown>;
}

export interface WorkerInfo {
  worker: WorkerType;
  idle: boolean;
  idleTimeout: NodeJS.Timeout | null;
  taskCount: number;
}

export interface WorkerPoolEvents {
  'worker:created': (event: { worker: WorkerType; totalWorkers: number }) => void;
  'worker:exited': (event: { worker: WorkerType; code: number; totalWorkers: number }) => void;
  'worker:error': (event: { worker: WorkerType; error: Error }) => void;
  'error': (event: { worker: WorkerType; error: Error }) => void;
  'message': (event: { worker: WorkerType; message: unknown }) => void;
  'terminated': () => void;
}

declare interface WorkerPool {
  on<U extends keyof WorkerPoolEvents>(
    event: U,
    listener: WorkerPoolEvents[U]
  ): this;
  
  once<U extends keyof WorkerPoolEvents>(
    event: U,
    listener: WorkerPoolEvents[U]
  ): this;
  
  off<U extends keyof WorkerPoolEvents>(
    event: U,
    listener: WorkerPoolEvents[U]
  ): this;
  
  emit<U extends keyof WorkerPoolEvents>(
    event: U,
    ...args: Parameters<WorkerPoolEvents[U]>
  ): boolean;
}

declare class WorkerPool extends EventEmitter {
  constructor(workerScript: string | Function, options?: WorkerPoolOptions);
  
  /**
   * Execute a task using the worker pool
   * @param data - Data to send to the worker
   * @param transfer - Optional array of transferable objects
   * @returns A promise that resolves with the task result
   */
  execute<T = unknown, R = unknown>(data: T, transfer?: Transferable[]): Promise<R>;
  
  /**
   * Get statistics about the worker pool
   * @returns An object with worker statistics
   */
  getWorkerStats(): {
    total: number;
    idle: number;
    busy: number;
    queueSize: number;
  };
  
  /**
   * Terminate all workers and clear the queue
   * @returns A promise that resolves when all workers are terminated
   */
  terminate(): Promise<void>;
}

export { WorkerPool };
export default WorkerPool;
