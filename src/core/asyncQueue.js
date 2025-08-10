import { AbortError, QueueOverflowError, ValidationError } from '../errors.js';
import { QUEUE_POLICIES } from '../constants.js';

/**
 * Creates an async queue for buffering values between producers and consumers
 * @param {Object} [options={}] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the queue
 * @param {number} [options.queueLimit=0] - Maximum queue size (0 = unlimited)
 * @param {'drop-old'|'drop-new'|'throw'} [options.onOverflow='throw'] - Behavior on queue overflow
 * @returns {Object} Queue instance with async iterator interface
 * @throws {ValidationError} If queueLimit is not a non-negative number
 * @throws {ValidationError} If onOverflow is not one of 'drop-old', 'drop-new', or 'throw'
 */
export function createAsyncQueue({ signal, queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW } = {}) {
  if (queueLimit < 0) {
    throw new ValidationError('queueLimit must be a non-negative number');
  }
  
  if (!Object.values(QUEUE_POLICIES).includes(onOverflow)) {
    throw new ValidationError(
      `onOverflow must be one of: ${Object.values(QUEUE_POLICIES).join(', ')}`
    );
  }

  const queue = [];
  const waiting = [];
  let ended = false;
  let error = null;

  // Handle abort signal if provided
  const onAbort = () => {
    const abortError = new AbortError();
    error = abortError;
    // Reject all waiting promises
    while (waiting.length > 0) {
      const { resolve, reject } = waiting.shift();
      reject(abortError);
    }
  };

  if (signal) {
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  /**
   * Add a value to the queue
   * @param {any} value - The value to enqueue
   * @returns {boolean} True if the value was added, false if dropped due to queue limit
   * @throws {QueueOverflowError} If the queue is full and onOverflow is 'throw'
   */
  function enqueue(value) {
    if (error) {
      throw error;
    }
    
    if (ended) {
      throw new Error('Cannot enqueue to an ended queue');
    }

    // If there are waiting consumers, resolve the oldest one immediately
    if (waiting.length > 0) {
      const { resolve } = waiting.shift();
      resolve(value);
      return true;
    }

    // Check queue limit
    if (queueLimit > 0 && queue.length >= queueLimit) {
      if (onOverflow === QUEUE_POLICIES.THROW) {
        throw new QueueOverflowError();
      } else if (onOverflow === QUEUE_POLICIES.DROP_OLD) {
        queue.shift(); // Remove oldest item
      } else if (onOverflow === QUEUE_POLICIES.DROP_NEW) {
        return false; // Drop the new item
      }
    }

    // Add to the queue
    queue.push(value);
    return true;
  }

  /**
   * Mark the queue as ended, optionally with an error
   * @param {Error} [err] - Optional error to end the queue with
   */
  function end(err) {
    if (ended) return;
    
    ended = true;
    error = error || err || null;
    
    // Resolve all waiting promises with done: true
    while (waiting.length > 0) {
      const { resolve } = waiting.shift();
      resolve({ done: true });
    }
    
    // Clean up
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Get the next value from the queue
   * @returns {Promise<IteratorResult>} The next value or done: true if ended
   */
  async function next() {
    // If there's an error, throw it
    if (error) {
      throw error;
    }
    
    // If there are items in the queue, return the next one
    if (queue.length > 0) {
      return { value: queue.shift(), done: false };
    }
    
    // If the queue is ended, return done
    if (ended) {
      return { done: true };
    }
    
    // Otherwise, wait for a value or end
    return new Promise((resolve, reject) => {
      waiting.push({ resolve, reject });
    });
  }

  // Return the queue interface
  return {
    enqueue,
    end,
    next,
    [Symbol.asyncIterator]() {
      return this;
    },
    return() {
      end();
      return Promise.resolve({ done: true });
    },
    throw(err) {
      end(err);
      return Promise.reject(err);
    }
  };
}
