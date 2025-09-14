import { InvalidOperatorArgumentError, OperatorAbortedError, BatchOperationError } from './errors';

/**
 * Creates a batching operator that collects items into arrays of specified size
 * @param {number} size - The maximum size of each batch
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.timeoutMs] - Maximum time to wait for a batch to fill
 * @param {AbortSignal} [options.signal] - Signal to abort the operation
 * @returns {function(AsyncIterable): AsyncIterable} A function that transforms an AsyncIterable into batches
 */
export function batch(size, options = {}) {
  const { timeoutMs, signal } = options;

  return async function* batchOperator(source) {
    if (size <= 0) throw new InvalidOperatorArgumentError('Batch size must be positive');
    
    let batch = [];
    let timeout;
    
    try {
      for await (const item of source) {
        batch.push(item);
        
        if (batch.length >= size) {
          yield [...batch];
          batch = [];
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
        } else if (timeoutMs && !timeout) {
          timeout = setTimeout(async () => {
            if (batch.length > 0) {
              yield [...batch];
              batch = [];
            }
          }, timeoutMs);
        }
        
        if (signal?.aborted) {
          throw new OperatorAbortedError('Batch operation aborted');
        }
      }
      
      // Yield remaining items
      if (batch.length > 0) {
        yield [...batch];
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };
}

/**
 * Creates a windowing operator that yields overlapping batches of items
 * @param {number} size - The size of each window
 * @param {number} [slide=1] - Number of items to slide the window by
 * @param {Object} [options] - Optional configuration
 * @param {AbortSignal} [options.signal] - Signal to abort the operation
 * @returns {function(AsyncIterable): AsyncIterable} A function that transforms an AsyncIterable into sliding windows
 */
export function window(size, slide = 1, options = {}) {
  const { signal } = options;
  
  return async function* windowOperator(source) {
    if (size <= 0) throw new Error('Window size must be positive');
    if (slide <= 0) throw new Error('Slide amount must be positive');
    
    let buffer = [];
    
    try {
      for await (const item of source) {
        buffer.push(item);
        
        if (buffer.length >= size) {
          yield [...buffer];
          buffer = buffer.slice(slide);
        }
        
        if (signal?.aborted) {
          throw new Error('Window operation aborted');
        }
      }
      
      // Yield remaining complete windows
      while (buffer.length >= size) {
        yield [...buffer.slice(0, size)];
        buffer = buffer.slice(slide);
      }
    } finally {
      buffer = null; // Help GC
    }
  };
}
