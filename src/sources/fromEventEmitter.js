import { createAsyncQueue } from '../core/asyncQueue.js';
import { QUEUE_POLICIES } from '../constants.js';
import { isEventEmitter, getCachedEmitterHandler, cleanupCachedHandlers } from '../utils/eventUtils.js';

/**
 * Creates an async iterable from an EventEmitter
 * @param {EventEmitter} emitter - The EventEmitter to listen to
 * @param {string} eventName - The name of the event to listen for
 * @param {Object} [options] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the subscription
 * @param {number} [options.queueLimit=0] - Maximum queue size (0 = unlimited)
 * @param {'drop-old'|'drop-new'|'throw'} [options.onOverflow='throw'] - Behavior on queue overflow
 * @returns {AsyncIterable} An async iterable that yields events
 * @throws {TypeError} If emitter is not an EventEmitter
 * @throws {TypeError} If eventName is not a string
 */
export function fromEventEmitter(emitter, eventName, { signal, queueLimit = 0, onOverflow = QUEUE_POLICIES.THROW } = {}) {
  if (!isEventEmitter(emitter)) {
    throw new TypeError('emitter must be an EventEmitter');
  }
  
  if (typeof eventName !== 'string') {
    throw new TypeError('eventName must be a string');
  }
  
  const queue = createAsyncQueue({ signal, queueLimit, onOverflow });
  
  // Create a handler for the event
  const handleEvent = (...args) => {
    try {
      // For EventEmitter, we pass all arguments to the queue
      queue.enqueue(args.length === 1 ? args[0] : args);
    } catch (error) {
      // If enqueue throws (e.g., due to queue overflow), clean up and rethrow
      cleanup();
      throw error;
    }
  };
  
  // Get or create a cached handler
  const cachedHandler = getCachedEmitterHandler(emitter, eventName, handleEvent);
  
  // Set up the event listener
  emitter.on(eventName, cachedHandler);
  
  // Cleanup function
  const cleanup = () => {
    emitter.off(eventName, cachedHandler);
    queue.end();
    cleanupCachedHandlers(emitter);
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

export default fromEventEmitter;
