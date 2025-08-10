import { ValidationError, AbortError } from '../errors.js';

/**
 * Creates an AsyncIterable that emits values at a fixed interval
 * @param {number} ms - The interval in milliseconds
 * @param {Object} [options] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to stop the interval
 * @param {number} [options.count=Infinity] - Maximum number of values to emit
 * @yields {number} The current iteration count (0-based)
 */
export async function* fromInterval(ms, { signal, count = Infinity } = {}) {
  if (ms < 0) {
    throw new ValidationError('Interval must be a non-negative number');
  }
  
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) {
      throw new AbortError();
    }
    
    yield i;
    
    if (i < count - 1) {
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new AbortError());
        });
      });
    }
  }
}

export default fromInterval;
