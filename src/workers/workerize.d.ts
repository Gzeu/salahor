/**
 * Type definitions for workerize utility
 * @module workers/workerize
 */

declare type WorkerPool = import('./WorkerPool').default;

declare interface WorkerizeOptions {
  minWorkers?: number;
  maxWorkers?: number;
  idleTimeout?: number;
  workerOptions?: Record<string, unknown>;
}

declare type WorkerizedFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>;

/**
 * Converts a function into a worker-based function
 * @template T - The type of the function to workerize
 * @param {T} fn - The function to workerize
 * @param {WorkerizeOptions} [options] - Worker pool options
 * @returns {WorkerizedFunction<T>} Workerized function that returns a Promise
 */
declare function workerize<T extends (...args: any[]) => any>(
  fn: T,
  options?: WorkerizeOptions
): WorkerizedFunction<T>;

/**
 * Terminates all workerized functions and cleans up resources
 * @returns {Promise<void>}
 */
declare function terminateWorkerizedFunctions(): Promise<void>;

export { workerize, terminateWorkerizedFunctions };
export default workerize;
