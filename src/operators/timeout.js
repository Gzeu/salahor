import { AbortError } from '../errors.js';

/**
 * Creates an async iterable that throws an error if a value is not emitted within
 * the specified time period.
 * 
 * @param {number} ms - The timeout duration in milliseconds
 * @param {Object} [options] - Configuration options
 * @param {Error|string} [options.error] - Custom error or error message to throw on timeout
 * @returns {Function} A function that takes an async iterable and returns a new async iterable
 */
export function timeout(ms, { error } = {}) {
  return function (source) {
    return async function* () {
      for await (const value of source) {
        // Create a promise that will reject after the timeout
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutId = setTimeout(() => {
            const timeoutError = error
              ? (typeof error === 'string' ? new Error(error) : error)
              : new AbortError(`Operation timed out after ${ms}ms`);
            reject(timeoutError);
          }, ms);
          
          // Clean up the timeout if the iterator is closed
          return () => clearTimeout(timeoutId);
        });
        
        // Race the source value against the timeout
        const result = await Promise.race([
          Promise.resolve(value),
          timeoutPromise
        ]);
        
        // If we get here, the value was emitted before the timeout
        yield result;
      }
    }();
  };
}

export default timeout;
