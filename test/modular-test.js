// Test file to verify modular imports work as expected
import {
  // Core functions
  fromEventTarget,
  fromEventEmitter,
  toEventEmitter,
  toAsyncIterable,
  
  // Utility functions
  fromPromise,
  concat,
  race,
  fromInterval,
  
  // Operators
  map,
  filter,
  take,
  buffer,
  pipe,
  pipeOperators,
  retryIterable,
  scan,
  distinctUntilChanged,
  debounceTime,
  throttleTime,
  timeout,
  merge,
  zip,
  withQueue,
  
  // Constants
  QUEUE_POLICIES,
  ERROR_MESSAGES,
  
  // Error classes
  UniconnectError,
  AbortError,
  QueueOverflowError,
  ValidationError,
  NotSupportedError
} from '../src/index.js';

// Test default export
import mainExports from '../src/index.js';

// Simple test to verify all exports are available
console.log('All named exports are available:', {
  // Core functions
  fromEventTarget: typeof fromEventTarget === 'function',
  fromEventEmitter: typeof fromEventEmitter === 'function',
  toEventEmitter: typeof toEventEmitter === 'function',
  toAsyncIterable: typeof toAsyncIterable === 'function',
  
  // Utility functions
  fromPromise: typeof fromPromise === 'function',
  concat: typeof concat === 'function',
  race: typeof race === 'function',
  fromInterval: typeof fromInterval === 'function',
  
  // Operators
  map: typeof map === 'function',
  filter: typeof filter === 'function',
  take: typeof take === 'function',
  buffer: typeof buffer === 'function',
  pipe: typeof pipe === 'function',
  pipeOperators: typeof pipeOperators === 'function',
  retryIterable: typeof retryIterable === 'function',
  scan: typeof scan === 'function',
  distinctUntilChanged: typeof distinctUntilChanged === 'function',
  debounceTime: typeof debounceTime === 'function',
  throttleTime: typeof throttleTime === 'function',
  timeout: typeof timeout === 'function',
  merge: typeof merge === 'function',
  zip: typeof zip === 'function',
  withQueue: typeof withQueue === 'function',
  
  // Constants
  QUEUE_POLICIES: typeof QUEUE_POLICIES === 'object',
  ERROR_MESSAGES: typeof ERROR_MESSAGES === 'object',
  
  // Error classes
  UniconnectError: typeof UniconnectError === 'function',
  AbortError: typeof AbortError === 'function',
  QueueOverflowError: typeof QueueOverflowError === 'function',
  ValidationError: typeof ValidationError === 'function',
  NotSupportedError: typeof NotSupportedError === 'function',
  
  // Default export
  mainExports: mainExports !== undefined && typeof mainExports === 'object'
});

// Test a simple operator chain
async function testBasicFunctionality() {
  console.log('\nTesting basic functionality...');
  
  // Test fromPromise and map
  const promise = Promise.resolve([1, 2, 3, 4, 5]);
  const mapped = await pipe(
    fromPromise(promise),
    map(x => x * 2),
    filter(x => x > 5),
    take(2)
  );
  
  const results = [];
  for await (const value of mapped) {
    results.push(value);
  }
  
  console.log('Basic operator chain result:', results);
  console.assert(JSON.stringify(results) === '[6,8]', 'Basic operator chain test failed');
}

// Run the test
console.log('Running tests...');
testBasicFunctionality().catch(console.error);
