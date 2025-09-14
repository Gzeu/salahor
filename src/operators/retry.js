import { InvalidOperatorArgumentError, OperatorAbortedError, RetryExhaustedError } from './errors';

/**
 * Default retry backoff calculation
 * @param {number} attempt - The current retry attempt number (1-based)
 * @returns {number} The delay in milliseconds before the next retry
 */
function defaultBackoff(attempt) {
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
}

/**
 * Creates a retry operator that will resubscribe to the source on error
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.maxAttempts=3] - Maximum number of retry attempts
 * @param {function(number): number} [options.backoff=defaultBackoff] - Function to calculate delay between retries
 * @param {function(Error): boolean} [options.retryIf] - Predicate to determine if an error should trigger retry
 * @param {AbortSignal} [options.signal] - Signal to abort retries
 * @returns {function(AsyncIterable): AsyncIterable} A function that adds retry behavior to an AsyncIterable
 */
export function retry(options = {}) {
  const {
    maxAttempts = 3,
    backoff = defaultBackoff,
    retryIf = () => true,
    signal
  } = options;

  return async function* retryOperator(source) {
    let attempt = 1;
    
    while (true) {
      try {
        for await (const item of source) {
          yield item;
        }
        return; // Success - exit
      } catch (error) {
        if (attempt >= maxAttempts || !retryIf(error) || signal?.aborted) {
          throw new RetryExhaustedError(
            `Failed after ${attempt} attempts`,
            attempt,
            error
          );
        }
        
        const delay = backoff(attempt);
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('Retry operation aborted'));
            }, { once: true });
          }
        });
        
        attempt++;
      }
    }
  };
}

/**
 * Creates a retry operator with exponential backoff and jitter
 * @param {number} [maxAttempts=3] - Maximum number of retry attempts
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds
 * @param {number} [options.jitter=0.1] - Random jitter factor (0-1)
 * @param {AbortSignal} [options.signal] - Signal to abort retries
 * @returns {function(AsyncIterable): AsyncIterable} A function that adds retry behavior to an AsyncIterable
 */
export function retryWithBackoff(maxAttempts = 3, options = {}) {
  const {
    initialDelay = 1000,
    maxDelay = 30000,
    jitter = 0.1,
    signal
  } = options;
  
  function calculateBackoff(attempt) {
    const delay = Math.min(
      initialDelay * Math.pow(2, attempt - 1),
      maxDelay
    );
    
    if (jitter > 0) {
      const randomFactor = 1 + (Math.random() * 2 - 1) * jitter;
      return delay * randomFactor;
    }
    
    return delay;
  }
  
  return retry({
    maxAttempts,
    backoff: calculateBackoff,
    signal
  });
}
