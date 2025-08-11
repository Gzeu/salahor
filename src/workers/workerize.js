/**
 * Workerize - Convert a function into a worker-based function
 * @module workers/workerize
 */

import { WorkerPool } from './WorkerPool.js';

// Cache for workerized functions
const workerizedFunctions = new Map();

// Default worker options
const DEFAULT_OPTIONS = {
  minWorkers: 1,
  maxWorkers: 2,
  idleTimeout: 30000, // 30 seconds
  workerOptions: {},
};

// Generate a unique ID for functions
function getFunctionId(fn) {
  return `workerized-${Math.random().toString(36).substr(2, 9)}`;
}

// Create a worker script from a function
function createWorkerScript(fn) {
  const functionStr = fn.toString();
  const functionName = fn.name || 'workerFunction';
  
  return `
    ${functionStr}
    
    // Handle messages from the main thread
    self.onmessage = async function(e) {
      const { id, type, args } = e.data;
      
      if (type === 'exec') {
        try {
          // Call the worker function with the provided arguments
          const result = await ${functionName}.apply(null, args);
          
          // Send the result back to the main thread
          self.postMessage({
            id,
            type: 'result',
            result: result,
            // Handle transferable objects (for browser)
            _transfer: result?.buffer ? [result.buffer] : []
          }, result?.buffer ? [result.buffer] : []);
          
        } catch (error) {
          // Send the error back to the main thread
          self.postMessage({
            id,
            type: 'error',
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          });
        }
      }
    };
    
    // Notify that the worker is ready
    self.postMessage({ type: 'ready' });
  `;
}

/**
 * Convert a function into a worker-based function
 * @param {Function} fn - The function to workerize
 * @param {Object} [options] - Worker pool options
 * @param {number} [options.minWorkers=1] - Minimum number of workers
 * @param {number} [options.maxWorkers=2] - Maximum number of workers
 * @param {number} [options.idleTimeout=30000] - Idle timeout in ms
 * @param {Object} [options.workerOptions] - Options passed to WorkerPool
 * @returns {Function} Workerized function that returns a Promise
 */
export function workerize(fn, options = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected a function to workerize');
  }
  
  const functionId = getFunctionId(fn);
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Create a worker pool for this function
  const workerScript = createWorkerScript(fn);
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  
  const pool = new WorkerPool(workerUrl, {
    ...mergedOptions,
    workerOptions: {
      ...mergedOptions.workerOptions,
      name: functionId,
    },
  });
  
  // Store the worker pool for cleanup
  workerizedFunctions.set(functionId, {
    pool,
    cleanup: () => {
      pool.terminate().catch(console.error);
      URL.revokeObjectURL(workerUrl);
      workerizedFunctions.delete(functionId);
    },
  });
  
  // Return a function that will execute in a worker
  return async function workerizedFunction(...args) {
    const taskId = `${functionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      // Handle worker messages
      const onMessage = (event) => {
        const { id, type, result, error } = event.data || {};
        
        if (id === taskId) {
          cleanup();
          
          if (type === 'result') {
            resolve(result);
          } else if (type === 'error') {
            const err = new Error(error.message);
            err.name = error.name;
            err.stack = error.stack;
            reject(err);
          }
        }
      };
      
      // Handle worker errors
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      
      // Clean up event listeners
      const cleanup = () => {
        pool.off('message', onMessage);
        pool.off('error', onError);
      };
      
      // Set up event listeners
      pool.on('message', onMessage);
      pool.on('error', onError);
      
      // Execute the task
      pool.execute(
        { id: taskId, type: 'exec', args },
        // Find transferable objects in the arguments
        args
          .filter(arg => arg && typeof arg === 'object' && 'buffer' in arg)
          .map(arg => arg.buffer)
      );
    });
  };
}

/**
 * Terminate all workerized functions and clean up resources
 * @returns {Promise<void>}
 */
export async function terminateWorkerizedFunctions() {
  const cleanups = Array.from(workerizedFunctions.values())
    .map(({ cleanup }) => cleanup());
  
  await Promise.all(cleanups);
  workerizedFunctions.clear();
}

export default workerize;
