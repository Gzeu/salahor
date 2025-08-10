import { ValidationError } from '../errors.js';

// Cache for event handler functions to avoid creating new ones
const eventHandlerCache = new WeakMap();

// Cache for EventEmitter handlers
const emitterHandlerCache = new WeakMap();

/**
 * Check if an object is an EventTarget
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object is an EventTarget
 */
export function isEventTarget(obj) {
  return (
    obj &&
    typeof obj.addEventListener === 'function' &&
    typeof obj.removeEventListener === 'function' &&
    typeof obj.dispatchEvent === 'function'
  );
}

/**
 * Check if an object is an EventEmitter
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object is an EventEmitter
 */
export function isEventEmitter(obj) {
  return (
    obj &&
    typeof obj.on === 'function' &&
    typeof obj.off === 'function' &&
    typeof obj.emit === 'function'
  );
}

/**
 * Get or create a cached event handler
 * @param {Object} target - The target object
 * @param {Function} handler - The handler function
 * @returns {Function} Cached handler
 */
export function getCachedEventHandler(target, handler) {
  if (!eventHandlerCache.has(target)) {
    eventHandlerCache.set(target, new WeakMap());
  }
  
  const targetCache = eventHandlerCache.get(target);
  if (!targetCache.has(handler)) {
    targetCache.set(handler, function(event) {
      handler(event);
    });
  }
  
  return targetCache.get(handler);
}

/**
 * Get or create a cached EventEmitter handler
 * @param {Object} emitter - The EventEmitter
 * @param {string} eventName - The event name
 * @param {Function} handler - The handler function
 * @returns {Function} Cached handler
 */
export function getCachedEmitterHandler(emitter, eventName, handler) {
  if (!emitterHandlerCache.has(emitter)) {
    emitterHandlerCache.set(emitter, new Map());
  }
  
  const emitterCache = emitterHandlerCache.get(emitter);
  const cacheKey = `${eventName}:${handler.toString()}`;
  
  if (!emitterCache.has(cacheKey)) {
    emitterCache.set(cacheKey, function(...args) {
      handler(...args);
    });
  }
  
  return emitterCache.get(cacheKey);
}

/**
 * Clean up cached handlers for a target
 * @param {Object} target - The target object to clean up
 */
export function cleanupCachedHandlers(target) {
  if (eventHandlerCache.has(target)) {
    eventHandlerCache.delete(target);
  }
  if (emitterHandlerCache.has(target)) {
    emitterHandlerCache.delete(target);
  }
}

export default {
  isEventTarget,
  isEventEmitter,
  getCachedEventHandler,
  getCachedEmitterHandler,
  cleanupCachedHandlers
};
