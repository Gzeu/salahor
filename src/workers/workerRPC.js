/**
 * Worker RPC - Request/Response pattern for workers
 * @module workers/workerRPC
 */

import { WorkerPool } from './WorkerPool.js';

// Default options for RPC
const DEFAULT_OPTIONS = {
  minWorkers: 1,
  maxWorkers: 4,
  idleTimeout: 60000, // 1 minute
  workerOptions: {},
  timeout: 30000, // 30 seconds default timeout for RPC calls
};

// Request ID generator
let requestId = 0;
function generateRequestId() {
  return `rpc-${Date.now()}-${++requestId}`;
}

/**
 * Create an RPC interface for a worker
 * @param {string|Function} workerScript - Worker script or function
 * @param {Object} [options] - RPC options
 * @returns {Object} RPC interface with methods
 */
export function createWorkerRPC(workerScript, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const pool = new WorkerPool(workerScript, config);
  const pendingRequests = new Map();
  const methodCache = new Map();
  let isTerminated = false;

  // Handle worker messages
  const handleMessage = (event) => {
    const { id, type, method, params, result, error } = event.data || {};
    
    if (type === 'rpc:response' && id && pendingRequests.has(id)) {
      const { resolve, reject, timeout } = pendingRequests.get(id);
      clearTimeout(timeout);
      pendingRequests.delete(id);
      
      if (error) {
        const err = new Error(error.message || 'RPC Error');
        Object.assign(err, error);
        reject(err);
      } else {
        resolve(result);
      }
    }
  };

  // Handle worker errors
  const handleError = (error) => {
    // Reject all pending requests on error
    for (const [id, { reject }] of pendingRequests.entries()) {
      reject(new Error(`Worker error: ${error.message}`));
      pendingRequests.delete(id);
    }
  };

  // Set up event listeners
  pool.on('message', handleMessage);
  pool.on('error', handleError);

  /**
   * Call a method on the worker
   * @param {string} method - Method name
   * @param {...any} params - Method parameters
   * @returns {Promise<any>} Result from the worker
   */
  async function call(method, ...params) {
    if (isTerminated) {
      throw new Error('RPC interface has been terminated');
    }

    const id = generateRequestId();
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`RPC call to ${method} timed out after ${config.timeout}ms`));
        }
      }, config.timeout);

      // Store the request
      pendingRequests.set(id, { resolve, reject, timeout: timeoutId });

      // Send the request to the worker
      pool.execute({
        type: 'rpc:request',
        id,
        method,
        params
      }).catch(reject);
    });
  }

  /**
   * Create a method proxy for a given method name
   * @private
   */
  function createMethodProxy(method) {
    return new Proxy(function() {}, {
      apply: (target, thisArg, args) => call(method, ...args),
      get: (target, prop) => createMethodProxy(`${method}.${prop}`)
    });
  }

  /**
   * Terminate the RPC interface and clean up resources
   * @returns {Promise<void>}
   */
  async function terminate() {
    if (isTerminated) return;
    
    isTerminated = true;
    
    // Clean up event listeners
    pool.off('message', handleMessage);
    pool.off('error', handleError);
    
    // Reject all pending requests
    for (const [id, { reject }] of pendingRequests.entries()) {
      reject(new Error('RPC interface terminated'));
    }
    pendingRequests.clear();
    
    // Terminate the worker pool
    await pool.terminate();
  }

  // Create the RPC interface
  const rpc = new Proxy({}, {
    get: (target, prop) => {
      // Check if method is already cached
      if (methodCache.has(prop)) {
        return methodCache.get(prop);
      }
      
      // Create a new method proxy
      const methodProxy = createMethodProxy(prop);
      methodCache.set(prop, methodProxy);
      return methodProxy;
    }
  });

  // Add direct call method
  rpc.call = call;
  rpc.terminate = terminate;
  
  return rpc;
}

/**
 * Create a worker that handles RPC requests
 * @param {Object} methods - Object containing method implementations
 * @returns {string} Worker script as a string
 */
export function createRPCHandler(methods) {
  const methodMap = new Map();
  
  // Flatten the methods object into a map
  const flattenMethods = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'function') {
        methodMap.set(fullKey, value);
      } else if (value && typeof value === 'object') {
        flattenMethods(value, fullKey);
      }
    }
  };
  
  flattenMethods(methods);
  
  // Generate the worker script
  return `
    const methods = new Map();
    
    // Add methods to the map
    ${Array.from(methodMap.entries()).map(([name, fn]) => 
      `methods.set('${name}', ${fn.toString()});`
    ).join('\n')}
    
    // Handle RPC messages
    self.onmessage = async function(e) {
      const { type, id, method, params = [] } = e.data || {};
      
      if (type === 'rpc:request' && id) {
        try {
          const handler = methods.get(method);
          
          if (typeof handler !== 'function') {
            throw new Error(\`Method \${method} not found\`);
          }
          
          // Call the method with the provided parameters
          const result = await handler(...params);
          
          // Send the result back
          self.postMessage({
            type: 'rpc:response',
            id,
            result: result === undefined ? null : result
          });
          
        } catch (error) {
          // Send the error back
          self.postMessage({
            type: 'rpc:response',
            id,
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
    self.postMessage({ type: 'rpc:ready' });
  `;
}

export default {
  createWorkerRPC,
  createRPCHandler
};
