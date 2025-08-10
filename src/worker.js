/**
 * Worker-related utilities for salahor
 * Provides zero-dependency Web Worker integration
 */

import { createAsyncQueue } from './index.js';

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
    terminateOnComplete,
    onError
  } = { ...DEFAULT_WORKER_OPTIONS, ...options };

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
    
    if (terminateOnComplete) {
      worker.terminate();
    }
    
    return originalReturn ? await originalReturn() : { done: true };
  };

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
 * @returns {Worker}
 */
export function createWorker(fnOrUrl, options = {}) {
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

// Export worker utilities
export const workerUtils = {
  fromWorker,
  toWorker,
  createWorker,
  // Future: worker pools, task queues, etc.
};

export default workerUtils;
