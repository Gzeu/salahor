/**
 * Creates an async iterable from an EventTarget
 * @param {EventTarget} target - The EventTarget to listen to
 * @param {string} eventName - The name of the event to listen for
 * @param {Object} [options] - Configuration options
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel the subscription
 * @returns {AsyncIterable} An async iterable that yields events
 */
export function fromEvent(target, eventName, { signal } = {}) {
  const queue = [];
  const resolvers = [];
  
  // Event handler
  const handleEvent = (event) => {
    if (signal?.aborted) {
      cleanup();
      return;
    }
    
    if (resolvers.length > 0) {
      const resolve = resolvers.shift();
      resolve({ value: event, done: false });
    } else {
      queue.push(Promise.resolve({ value: event, done: false }));
    }
  };
  
  // Cleanup function
  const cleanup = () => {
    target.removeEventListener(eventName, handleEvent);
    if (signal) signal.removeEventListener('abort', cleanup);
    
    // Resolve any pending promises with done
    while (resolvers.length > 0) {
      const resolve = resolvers.shift();
      resolve({ done: true });
    }
  };
  
  // Set up event listener
  target.addEventListener(eventName, handleEvent);
  
  // Handle abort signal if provided
  if (signal) {
    signal.addEventListener('abort', cleanup);
  }
  
  // Return the async iterable
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (queue.length > 0) {
            return queue.shift();
          }
          
          if (signal?.aborted) {
            return Promise.resolve({ done: true });
          }
          
          return new Promise(resolve => {
            resolvers.push(resolve);
          });
        },
        return() {
          cleanup();
          return Promise.resolve({ done: true });
        },
        throw(error) {
          cleanup();
          return Promise.reject(error);
        }
      };
    }
  };
}
