import { isEventTarget, isEventEmitter } from './eventUtils.js';
import { fromEventTarget } from '../sources/fromEventTarget.js';
import { fromEventEmitter } from '../sources/fromEventEmitter.js';

/**
 * Converts various event sources to an async iterable
 * @param {any} source - The source to convert (EventTarget, EventEmitter, etc.)
 * @param {string} [eventName] - The event name (required for EventTarget/EventEmitter)
 * @param {Object} [options] - Additional options
 * @returns {AsyncIterable} An async iterable that yields events from the source
 * @throws {TypeError} If the source type is not supported
 */
export function toAsyncIterable(source, eventName, options) {
  if (isEventTarget(source)) {
    if (!eventName) {
      throw new TypeError('eventName is required for EventTarget sources');
    }
    return fromEventTarget(source, eventName, options);
  }
  
  if (isEventEmitter(source)) {
    if (!eventName) {
      throw new TypeError('eventName is required for EventEmitter sources');
    }
    return fromEventEmitter(source, eventName, options);
  }
  
  if (source && typeof source[Symbol.asyncIterator] === 'function') {
    return source; // Already an async iterable
  }
  
  if (source && typeof source[Symbol.iterator] === 'function') {
    // Convert sync iterable to async iterable
    return {
      async *[Symbol.asyncIterator]() {
        for (const value of source) {
          yield value;
        }
      }
    };
  }
  
  throw new TypeError('Unsupported source type');
}

export default toAsyncIterable;
