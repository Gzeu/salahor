import { AbortError } from '../errors.js';

/**
 * Creates a retry mechanism for async iterables
 * @param {Function} factory - A factory function that returns a new async iterable
 * @param {Object} [options] - Retry options
 * @param {number} [options.attempts=3] - Maximum number of attempts
 * @param {number} [options.delay=0] - Delay between retries in milliseconds
 * @returns {AsyncIterable} A new async iterable with retry logic
 */
export async function* retryIterable(factory, { attempts = 3, delay = 0 } = {}) {
  if (typeof factory !== 'function') {
    throw new Error('factory must be a function that returns an async iterable');
  }
  
  let lastError;
  
  for (let i = 0; i < attempts; i++) {
    try {
      const iterable = factory();
      for await (const value of iterable) {
        yield value;
      }
      // If we get here, the iterable completed successfully
      return;
    } catch (error) {
      lastError = error;
      
      if (i < attempts - 1 && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we've exhausted all attempts, throw the last error
  throw lastError || new Error('No attempts were made');
}

export default retryIterable;
