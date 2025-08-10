// uniconnect - zero-dependency connectors and operators
// Node 18+, ESM

// Core utilities
import { createAsyncQueue } from './core/asyncQueue.js';
import { QUEUE_POLICIES, ERROR_MESSAGES } from './constants.js';

// Connectors
import * as connectors from './connectors/index.js';

// Sources
import fromEventTarget from './sources/fromEventTarget.js';
import fromEventEmitter from './sources/fromEventEmitter.js';
import fromPromise from './sources/fromPromise.js';
import fromInterval from './sources/fromInterval.js';

// Operators
import map from './operators/map.js';
import filter from './operators/filter.js';
import take from './operators/take.js';
import buffer from './operators/buffer.js';
import scan from './operators/scan.js';
import distinctUntilChanged from './operators/distinctUntilChanged.js';
import debounceTime from './operators/debounceTime.js';
import throttleTime from './operators/throttleTime.js';
import timeout from './operators/timeout.js';
import merge from './operators/merge.js';
import zip from './operators/zip.js';
import concat from './operators/concat.js';
import race from './operators/race.js';
import { pipe, pipeOperators } from './operators/pipe.js';

// Utils
import toEventEmitter from './utils/toEventEmitter.js';
import toAsyncIterable from './utils/toAsyncIterable.js';
import { retryIterable } from './utils/retryIterable.js';

// Re-export withQueue from root
import { withQueue } from './withQueue.js';

// Export error classes
export { UniconnectError, AbortError, QueueOverflowError, ValidationError, NotSupportedError } from './errors.js';

// Re-export createAsyncQueue from core
// Note: createAsyncQueue is already imported and will be included in the exports below

// Export all named exports in a single statement
export {
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
  
  // Core utilities
  createAsyncQueue,
  
  // Constants
  QUEUE_POLICIES,
  ERROR_MESSAGES,
};

// Default export for backward compatibility
const mainExports = {
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
  
  // Core utilities
  createAsyncQueue,
  
  // Constants
  QUEUE_POLICIES,
  ERROR_MESSAGES,
};

export default mainExports;
