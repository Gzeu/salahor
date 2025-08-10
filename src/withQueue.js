import { QueueOverflowError, AbortError, ValidationError } from './index.js';

// Constants for queue overflow policies
const QUEUE_POLICIES = Object.freeze({
  DROP_OLD: 'drop-old',
  DROP_NEW: 'drop-new',
  THROW: 'throw'
});

// Re-export the queue policies
export { QUEUE_POLICIES };

/**
 * withQueue - Applies backpressure policies to any async iterable with optimized memory usage
 * and performance characteristics. Uses a circular buffer internally for efficient queue operations.
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.queueLimit=0] - Maximum queue size (0 = unlimited)
 * @param {'drop-old'|'drop-new'|'throw'} [options.onOverflow='throw'] - Behavior on queue overflow
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel iteration
 * @returns {Function} A function that wraps an async iterable with queue behavior
 * @throws {ValidationError} If queueLimit is negative
 * @throws {ValidationError} If onOverflow is not a valid policy
 */
export function withQueue({ queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW, signal } = {}) {
  // Validate inputs
  if (typeof queueLimit !== 'number' || queueLimit < 0) {
    throw new ValidationError('queueLimit must be a non-negative number');
  }
  
  if (!Object.values(QUEUE_POLICIES).includes(onOverflow)) {
    throw new ValidationError(
      `Invalid onOverflow policy. Must be one of: ${Object.values(QUEUE_POLICIES).join(', ')}`
    );
  }

  /**
   * Wraps an async iterable with the configured queue behavior
   * @param {AsyncIterable} sourceIterable - The source async iterable
   * @returns {AsyncIterable} A new async iterable with queue behavior applied
   */
  return function wrapIterable(sourceIterable) {
    // Circular buffer implementation
    let buffer = [];
    let head = 0;
    let tail = 0;
    let size = 0;
    
    // Promise state for async iteration
    let resolveNext = null;
    let nextPromise = null;
    let isDone = false;
    let error = null;
    let isPulling = false;
    let pullController = null;
    
    // Initialize the first promise
    const resetNextPromise = () => {
      nextPromise = new Promise((resolve) => {
        resolveNext = (value) => {
          resolveNext = null;
          resolve(value);
        };
      });
    };
    resetNextPromise();
    
    // Handle external abort
    const onAbort = () => {
      const err = new AbortError('Operation was aborted');
      fail(err);
    };
    
    // Set up abort handling if signal is provided
    let abortCleanup = null;
    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
        abortCleanup = () => signal.removeEventListener('abort', onAbort);
      }
    }

    // Pull from the source iterable
    const pullFromSource = async () => {
      if (isPulling || isDone) return;
      isPulling = true;
      
      try {
        for await (const value of sourceIterable) {
          if (isDone) break;
          
          // Apply queue limit policy if needed
          if (queueLimit > 0 && size >= queueLimit) {
            switch (onOverflow) {
              case QUEUE_POLICIES.DROP_OLD:
                // Remove the oldest item
                buffer[head] = undefined; // Clear reference
                head = (head + 1) % buffer.length;
                size--;
                break;
                
              case QUEUE_POLICIES.DROP_NEW:
                // Skip this value
                continue;
                
              case QUEUE_POLICIES.THROW:
                throw new QueueOverflowError('Queue overflow');
            }
          }
          
          // Add the new value to the buffer
          if (size === buffer.length) {
            // Need to grow the buffer
            const newBuffer = new Array(Math.max(1, buffer.length * 2));
            for (let i = 0; i < size; i++) {
              newBuffer[i] = buffer[(head + i) % buffer.length];
            }
            buffer = newBuffer;
            head = 0;
            tail = size;
          }
          
          buffer[tail] = value;
          tail = (tail + 1) % buffer.length;
          size++;
          
          // Notify any waiting consumers
          if (resolveNext) {
            const value = buffer[head];
            const r = resolveNext;
            resetNextPromise();
            r({ value, done: false });
          }
        }
        
        // Mark as done if not already done
        if (!isDone) {
          isDone = true;
          if (resolveNext) {
            const r = resolveNext;
            resetNextPromise();
            r({ value: undefined, done: true });
          }
        }
      } catch (err) {
        fail(err);
      } finally {
        isPulling = false;
        abortCleanup?.();
      }
    };
    
    // Handle errors
    const fail = (err) => {
      if (isDone) return;
      
      error = err instanceof Error ? err : new Error(String(err));
      isDone = true;
      
      // Clean up the buffer
      buffer = [];
      head = tail = size = 0;
      
      // Notify any waiting consumers
      if (resolveNext) {
        const r = resolveNext;
        resetNextPromise();
        r(Promise.reject(error));
      }
      
      // Clean up the abort listener
      abortCleanup?.();
      
      // Abort the source iteration if possible
      if (pullController) {
        pullController.abort();
        pullController = null;
      }
    };
    
    // Start pulling from source
    if (!isDone && !error) {
      // Use AbortController if the source supports it
      if (typeof sourceIterable.return === 'function') {
        pullController = new AbortController();
      }
      pullFromSource().catch(() => {});
    }

    // Return an async iterable that cleans up when done
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      
      async next() {
        // Fast path: buffer has items available
        if (size > 0) {
          const value = buffer[head];
          // Help GC by clearing the reference
          buffer[head] = undefined;
          head = (head + 1) % buffer.length;
          size--;
          
          // Start pulling the next value if needed
          if (size === 0 && !isPulling && !isDone) {
            pullFromSource().catch(() => {});
          }
          
          return { value, done: false };
        }
        
        // If we're done, return done
        if (isDone) {
          if (error) throw error;
          return { value: undefined, done: true };
        }
        
        // Wait for the next value or for the source to complete
        const result = await nextPromise;
        
        // Start pulling the next value
        if (!isDone && !isPulling) {
          pullFromSource().catch(() => {});
        }
        
        return result;
      },
      
      async return() {
        if (isDone) return { value: undefined, done: true };
        
        isDone = true;
        
        // Clean up resources
        buffer = [];
        head = tail = size = 0;
        
        // Clean up the abort listener
        abortCleanup?.();
        
        // Abort the source iteration if possible
        if (pullController) {
          pullController.abort();
          pullController = null;
        }
        
        // Notify any waiting consumers
        if (resolveNext) {
          const r = resolveNext;
          resetNextPromise();
          r({ value: undefined, done: true });
        }
        
        return { value: undefined, done: true };
      },
      
      async throw(err) {
        fail(err);
        throw err;
      }
    };
  };
}

export default withQueue;
