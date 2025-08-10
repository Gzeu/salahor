/**
 * Worker utilities for salahor
 * Provides zero-dependency Web Worker integration
 */

// Check if we're in a browser or Node.js environment
const isBrowser = typeof window !== 'undefined' && 
                 typeof window.document !== 'undefined' &&
                 typeof Worker !== 'undefined';

const isNode = typeof process !== 'undefined' && 
               process.versions != null && 
               process.versions.node != null;

// Use dynamic import for Node.js worker threads
let workerThreads;
if (isNode && !isBrowser) {
  try {
    workerThreads = await import('node:worker_threads');
  } catch (error) {
    console.warn('Worker threads not available:', error.message);
  }
}

// Use a local createAsyncQueue to avoid circular dependencies
const createAsyncQueue = (options = {}) => {
  // Simple queue implementation for worker utilities
  const queue = [];
  const waiting = [];
  let closed = false;
  let error = null;
  
  const push = (value) => {
    if (closed) return;
    if (waiting.length > 0) {
      waiting.shift()({ value, done: false });
    } else {
      queue.push(Promise.resolve({ value, done: false }));
    }
  };
  
  const close = () => {
    if (closed) return;
    closed = true;
    waiting.forEach(resolve => resolve({ done: true }));
  };
  
  const throwError = (err) => {
    error = err;
    closed = true;
    if (waiting.length > 0) {
      waiting.shift()(Promise.reject(err));
    }
  };
  
  return {
    push,
    close,
    throw: throwError,
    [Symbol.asyncIterator]() {
      return {
        next: () => {
          if (error) return Promise.reject(error);
          if (queue.length > 0) return queue.shift();
          if (closed) return Promise.resolve({ done: true });
          return new Promise(resolve => waiting.push(resolve));
        },
        return: () => {
          close();
          return Promise.resolve({ done: true });
        },
        throw: (err) => {
          throwError(err);
          return Promise.reject(err);
        }
      };
    }
  };
};

// Default worker options
const DEFAULT_WORKER_OPTIONS = {
  // Transferable objects handling
  transfer: [],
  // Worker termination behavior
  terminateOnComplete: true,
  // Error handling strategy ('throw' | 'continue' | function)
  onError: 'throw',
  // Custom message handler
  messageHandler: undefined
};

/**
 * Creates an async iterable from a WebWorker's messages
 * @param {Worker} worker - The WebWorker instance
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.messageHandler] - Custom message handler function
 * @param {boolean} [options.terminateOnComplete=true] - Whether to terminate worker on completion
 * @param {string|Function} [options.onError='throw'] - Error handling strategy
 * @returns {AsyncIterable} Async iterable of worker messages
 */
export function fromWorker(worker, options = {}) {
  const {
    messageHandler = (event) => event.data,
    terminateOnComplete = true,
    onError = 'throw'
  } = { ...DEFAULT_WORKER_OPTIES, ...options };

  const queue = createAsyncQueue({
    onError: (error) => {
      if (typeof onError === 'function') {
        onError(error);
      } else if (onError === 'throw') {
        queue.throw(error);
      }
      // 'continue' strategy does nothing, drops the error
    }
  });

  if (isBrowser || !workerThreads) {
    // Browser Web Worker or Node.js without worker_threads
    const messageHandlerWrapper = (event) => {
      try {
        const result = messageHandler(event);
        if (result !== undefined) {
          queue.push(result);
        }
      } catch (error) {
        queue.throw(error);
      }
    };

    const errorHandler = (event) => {
      queue.throw(event.error || new Error('Worker error'));
    };

    worker.addEventListener('message', messageHandlerWrapper);
    worker.addEventListener('error', errorHandler);

    // Handle worker termination
    const originalReturn = queue.return;
    queue.return = async () => {
      worker.removeEventListener('message', messageHandlerWrapper);
      worker.removeEventListener('error', errorHandler);
      
      if (terminateOnComplete && typeof worker.terminate === 'function') {
        worker.terminate();
      }
      
      return originalReturn ? await originalReturn() : { done: true };
    };
  } else {
    // Node.js worker_threads
    worker.on('message', (message) => {
      try {
        const result = messageHandler({ data: message });
        if (result !== undefined) {
          queue.push(result);
        }
      } catch (error) {
        queue.throw(error);
      }
    });

    worker.on('error', (error) => {
      queue.throw(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        queue.throw(new Error(`Worker stopped with exit code ${code}`));
      }
      queue.close();
    });

    // Handle worker termination
    const originalReturn = queue.return;
    queue.return = async () => {
      if (terminateOnComplete && worker.terminate) {
        await worker.terminate();
      }
      return originalReturn ? await originalReturn() : { done: true };
    };
  }

  return queue;
}

/**
 * Sends values from an async iterable to a WebWorker
 * @param {Worker} worker - The WebWorker instance
 * @param {AsyncIterable} source - Source async iterable
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.transfer] - Function that returns transferable objects for each value
 * @param {boolean} [options.terminateOnComplete=true] - Whether to terminate worker on completion
 * @returns {Promise<void>}
 */
export async function toWorker(worker, source, options = {}) {
  const { 
    transfer = () => [],
    terminateOnComplete = true
  } = options;

  try {
    for await (const value of source) {
      const transferList = transfer(value) || [];
      worker.postMessage(value, transferList);
    }
  } finally {
    if (terminateOnComplete) {
      worker.terminate();
    }
  }
}

/**
 * Creates a worker from a function or module URL
 * @param {Function|string} fnOrUrl - Worker function or module URL
 * @param {Object} [options] - Worker options
 * @returns {Worker|Object} Worker instance or mock in unsupported environments
 */
export function createWorker(fnOrUrl, options = {}) {
  // In browser environment with Worker support
  if (isBrowser && typeof Worker !== 'undefined') {
    if (typeof fnOrUrl === 'string') {
      return new Worker(fnOrUrl, options);
    }

    const blob = new Blob([
      'const fn = ' + fnOrUrl.toString() + ';',
      'self.onmessage = async (e) => {',
      '  try {',
      '    const result = await fn(e);',
      '    self.postMessage(result);',
      '  } catch (error) {',
      '    self.postMessage({ error: error.message });',
      '  }',
      '};'
    ], { type: 'application/javascript' });

    return new Worker(URL.createObjectURL(blob), options);
  }
  
  // In Node.js or unsupported environment, return a mock worker
  if (isNode) {
    return {
      postMessage: (data) => {
        if (typeof process === 'object' && process.nextTick) {
          process.nextTick(() => {
            if (typeof fnOrUrl === 'function') {
              try {
                const result = fnOrUrl({ data });
                if (result && typeof result.then === 'function') {
                  result.then(r => {
                    if (this.onmessage) {
                      this.onmessage({ data: r });
                    }
                  }).catch(err => {
                    if (this.onerror) {
                      this.onerror(err);
                    }
                  });
                } else if (this.onmessage) {
                  this.onmessage({ data: result });
                }
              } catch (error) {
                if (this.onerror) {
                  this.onerror(error);
                }
              }
            }
          });
        }
      },
      terminate: () => {},
      addEventListener: (event, handler) => {
        if (event === 'message') this.onmessage = handler;
        if (event === 'error') this.onerror = handler;
      },
      removeEventListener: (event) => {
        if (event === 'message') this.onmessage = null;
        if (event === 'error') this.onerror = null;
      },
      onmessage: null,
      onerror: null
    };
  }
  
  // In unsupported environments, throw an error
  throw new Error('Web Workers are not supported in this environment');
}
