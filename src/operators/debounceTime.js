import { ValidationError, AbortError } from '../errors.js';

/**
 * Creates an async iterable that only emits a value from the source iterable
 * after a specified time span has passed without another source emission.
 * 
 * @param {number} ms - The debounce time in milliseconds
 * @returns {Function} A function that takes an async iterable and returns a new async iterable
 * @throws {ValidationError} If ms is negative
 */
export function debounceTime(ms) {
  if (ms < 0) {
    throw new ValidationError('Debounce time must be non-negative');
  }
  
  return function (source) {
    return async function* () {
      let timeoutId;
      let pendingValue;
      let hasPendingValue = false;
      let resolvePending;
      let rejectPending;
      
      // Cleanup function to clear any pending timeouts
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (resolvePending) {
          resolvePending();
          resolvePending = null;
          rejectPending = null;
        }
      };
      
      try {
        for await (const value of source) {
          // If there's a pending value, resolve it immediately
          if (hasPendingValue && resolvePending) {
            resolvePending();
            resolvePending = null;
            rejectPending = null;
          }
          
          // Store the new value and set up the debounce
          pendingValue = value;
          hasPendingValue = true;
          
          // Wait for either the debounce time to elapse or for the next value
          await new Promise((resolve, reject) => {
            resolvePending = resolve;
            rejectPending = reject;
            
            timeoutId = setTimeout(() => {
              timeoutId = null;
              resolve();
            }, ms);
          });
          
          // If we get here and still have a pending value, yield it
          if (hasPendingValue) {
            yield pendingValue;
            hasPendingValue = false;
            pendingValue = null;
          }
        }
        
        // Handle any final pending value
        if (hasPendingValue) {
          yield pendingValue;
        }
        
      } catch (error) {
        // If the source throws, clean up and rethrow
        cleanup();
        throw error;
      } finally {
        cleanup();
      }
    }();
  };
}

export default debounceTime;
