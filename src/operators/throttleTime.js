import { ValidationError } from '../errors.js';

/**
 * Creates an async iterable that emits values from the source iterable at most once
 * per specified time interval, with options for leading/trailing emissions.
 * 
 * @param {number} ms - The throttle duration in milliseconds
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.leading=true] - Whether to emit the first value in the interval
 * @param {boolean} [options.trailing=true] - Whether to emit the last value in the interval
 * @returns {Function} A function that takes an async iterable and returns a new async iterable
 * @throws {ValidationError} If ms is negative
 */
export function throttleTime(ms, { leading = true, trailing = true } = {}) {
  if (ms < 0) {
    throw new ValidationError('Throttle time must be non-negative');
  }
  
  return function (source) {
    return async function* () {
      let lastEmittedTime = 0;
      let pendingValue;
      let hasPendingValue = false;
      let timeoutId;
      let resolvePending;
      
      // Cleanup function to clear any pending timeouts
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (resolvePending) {
          resolvePending();
          resolvePending = null;
        }
      };
      
      try {
        for await (const value of source) {
          const currentTime = Date.now();
          const timeSinceLastEmission = currentTime - lastEmittedTime;
          
          // If we haven't emitted in the last interval, emit immediately
          if (timeSinceLastEmission >= ms) {
            lastEmittedTime = currentTime;
            yield value;
            continue;
          }
          
          // Otherwise, schedule for later if trailing is enabled
          if (trailing) {
            pendingValue = value;
            hasPendingValue = true;
            
            if (!timeoutId) {
              const timeUntilNextEmission = ms - timeSinceLastEmission;
              
              await new Promise((resolve) => {
                resolvePending = resolve;
                
                timeoutId = setTimeout(() => {
                  timeoutId = null;
                  lastEmittedTime = Date.now();
                  hasPendingValue = false;
                  resolve();
                }, timeUntilNextEmission);
              });
              
              if (pendingValue !== undefined) {
                yield pendingValue;
                pendingValue = undefined;
              }
            }
          }
        }
        
        // Handle any final pending value
        if (hasPendingValue && pendingValue !== undefined) {
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

export default throttleTime;
