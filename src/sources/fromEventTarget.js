import { createAsyncQueue } from '../core/asyncQueue.js';
import { QUEUE_POLICIES } from '../constants.js';
import { isEventTarget, getCachedEventHandler, cleanupCachedHandlers } from '../utils/eventUtils.js';

/**
 * Creates an async iterable from an EventTarget
 * @param {EventTarget} target - The EventTarget to listen to
 * @param {string} eventName - The name of the event to listen for
 * @param {Object} [options] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the subscription
 * @param {number} [options.queueLimit=0] - Maximum queue size (0 = unlimited)
 * @param {'drop-old'|'drop-new'|'throw'} [options.onOverflow='throw'] - Behavior on queue overflow
 * @returns {AsyncIterable} An async iterable that yields events
 * @throws {TypeError} If target is not an EventTarget
 * @throws {TypeError} If eventName is not a string
 */
export function fromEventTarget(target, eventName, { signal, queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW } = {}) {
  if (!isEventTarget(target)) {
    throw new TypeError('target must be an EventTarget');
  }
  
  if (typeof eventName !== 'string') {
    throw new TypeError('eventName must be a string');
  }
  
  const queue = createAsyncQueue({ signal, queueLimit, onOverflow });
  
  // Create a cached event handler to avoid creating new functions
  const handleEvent = (event) => {
    try {
      queue.enqueue(event);
    } catch (error) {
      // If enqueue throws (e.g., due to queue overflow), clean up and rethrow
      cleanup();
      throw error;
    }
  };
  
  // Get or create a cached handler
  const cachedHandler = getCachedEventHandler(target, handleEvent);
  
  // Set up the event listener
  target.addEventListener(eventName, cachedHandler);
  
  // Cleanup function
  const cleanup = () => {
    target.removeEventListener(eventName, cachedHandler);
    queue.end();
    cleanupCachedHandlers(target);
  };
  
  // Handle abort signal if provided
  if (signal) {
    signal.addEventListener('abort', cleanup, { once: true });
  }
  
  // Return the async iterable
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => queue.next(),
        return: () => {
          cleanup();
          return Promise.resolve({ done: true });
        },
        throw: (error) => {
          cleanup();
          return Promise.reject(error);
        }
      };
    }
  };
}

export default fromEventTarget;
