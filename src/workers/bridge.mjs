/**
 * Worker bridge for salahor
 * Provides a bridge between main thread and worker threads
 * @module workers/bridge
 */

import { runInWorker, supportsWorkers, getWorkerSupport } from './main.mjs';

// Cache for worker support check
let workerSupportChecked = false;

/**
 * Get detailed information about worker support
 * @returns {Object} Worker support information
 */
export function getWorkerSupportInfo() {
  return getWorkerSupport();
}

/**
 * Log worker support information
 * @param {Object} [logger=console] - Logger object with log method
 */
export function logWorkerSupport(logger = console) {
  const support = getWorkerSupport();
  
  logger.log('\n=== Worker Support Information ===');
  logger.log(`Node.js Version: ${support.version}`);
  logger.log(`Worker Threads Available: ${support.hasWorkerThreads ? '✅' : '❌'}`);
  logger.log(`Experimental Worker Flag: ${support.isExperimental ? '✅' : '❌'}`);
  logger.log(`Workers Supported: ${support.supported ? '✅' : '❌'}`);
  logger.log(`Status: ${support.message}`);
  
  if (!support.supported) {
    logger.warn('\n⚠️  Workers are not supported in this environment.');
    logger.log(`\nTo enable workers, you can try:`);
    if (!support.isSupportedVersion) {
      logger.log(`- Upgrade to Node.js ${support.requirements.recommendedNodeVersion} (recommended) or`);
    }
    if (support.hasWorkerThreads && !support.isExperimental) {
      logger.log(`- Run with --experimental-worker flag: node --experimental-worker your-script.js`);
    }
  }
  
  return support;
}

/**
 * Runs a task in a worker thread with fallback to main thread if workers are not supported
 * @param {Function} task - The task function to run
 * @param {any} data - The data to pass to the task
 * @param {Object} [options] - Options for task execution
 * @param {boolean} [options.useWorker=true] - Whether to use a worker thread
 * @param {string} [options.workerModule] - Path to the worker module (required if useWorker is true)
 * @param {Function} [options.onFallback] - Callback when falling back to main thread
 * @param {Function} [options.onWorkerError] - Callback when worker fails
 * @returns {Promise<any>} The result of the task
 */
export async function runTask(task, data, {
  useWorker = true,
  workerModule,
  onFallback,
  onWorkerError,
  ...workerOptions
} = {}) {
  // Log worker support information on first run
  if (!workerSupportChecked) {
    logWorkerSupport(console);
    workerSupportChecked = true;
  }
  
  // Validate worker module if using worker
  if (useWorker && !workerModule) {
    console.warn('Worker module not provided, falling back to main thread');
    useWorker = false;
  }
  
  // If not using worker or workers are not supported, run in main thread
  if (!useWorker || !supportsWorkers()) {
    onFallback?.(new Error('Workers not supported or disabled'));
    return task(data);
  }

  try {
    const result = await runInWorker(workerModule, data, workerOptions);
    return result.data;
  } catch (error) {
    // If worker fails, fall back to main thread
    const fallbackError = new Error(`Worker execution failed: ${error.message}`);
    fallbackError.cause = error;
    
    onWorkerError?.(fallbackError);
    onFallback?.(fallbackError);
    
    console.warn(fallbackError.message);
    console.warn('Falling back to main thread execution');
    
    return task(data);
  }
}

/**
 * Creates a worker task runner
 * @param {Function} task - The task function to run
 * @param {string} workerModule - Path to the worker module
 * @param {Object} [options] - Default options for the runner
 * @returns {Function} A function that runs the task with the given options
 */
export function createWorkerTask(task, workerModule, options = {}) {
  return async (data, taskOptions = {}) => {
    return runTask(task, data, {
      ...options,
      ...taskOptions,
      workerModule,
    });
  };
}

export default {
  runTask,
  createWorkerTask,
  supportsWorkers,
};
