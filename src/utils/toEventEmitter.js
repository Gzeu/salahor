import { isEventEmitter } from './eventUtils.js';

/**
 * Converts an async iterable to an EventEmitter
 * @param {AsyncIterable} asyncIterable - The async iterable to convert
 * @param {Object} emitter - The EventEmitter to emit events to
 * @param {string} eventName - The name of the event to emit
 * @returns {Promise<void>} A promise that resolves when the iteration is complete
 * @throws {TypeError} If emitter is not an EventEmitter
 */
export async function toEventEmitter(asyncIterable, emitter, eventName) {
  if (!isEventEmitter(emitter)) {
    throw new TypeError('emitter must be an EventEmitter');
  }
  
  try {
    for await (const value of asyncIterable) {
      emitter.emit(eventName, value);
    }
    emitter.emit('end');
  } catch (error) {
    emitter.emit('error', error);
    throw error;
  }
}

export default toEventEmitter;
