/**
 * Simple test file for worker utilities
 * Tests the core functionality of worker utilities
 */

// Simple test function to avoid dependencies
function test(name, fn) {
  console.log(`\n${name}`);
  try {
    fn();
    console.log('  ✓ Passed');
    return true;
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack.split('\n').slice(0, 3).join('\n'));
    }
    return false;
  }
}

// Simple assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}. Expected ${expected}, got ${actual}`);
  }
}

// Import worker utilities
import { fromWorker, toWorker, createWorker } from '../src/worker-utils.js';

// Simple worker function for testing
const testWorkerFn = (e) => {
  if (e.data === 'error') {
    throw new Error('Test error');
  }
  return { result: e.data * 2 };
};

// Run tests
console.log('Starting worker utility tests...');
let passed = 0;
let total = 0;

// Test 1: Create worker from function
total++;
passed += test('createWorker - creates worker from function', () => {
  const worker = createWorker(testWorkerFn);
  assert(worker, 'Worker should be created');
  assert(typeof worker.postMessage === 'function', 'Worker should have postMessage method');
  worker.terminate();
}) ? 1 : 0;

// Test 2: Process worker messages
total++;
passed += test('fromWorker - processes worker messages', async () => {
  const worker = createWorker(testWorkerFn);
  const messages = fromWorker(worker);
  
  // Send a message to the worker
  worker.postMessage(5);
  
  // Get the first message
  const iterator = messages[Symbol.asyncIterator]();
  const { value } = await iterator.next();
  
  assertEqual(value.result, 10, 'Should process worker message');
  
  // Cleanup
  worker.terminate();
  await iterator.return();
}) ? 1 : 0;

// Test 3: Send values to worker
total++;
passed += test('toWorker - sends values to worker', async () => {
  let results = [];
  const worker = createWorker((e) => {
    return { received: e.data };
  });
  
  // Listen for messages
  worker.onmessage = (e) => results.push(e.data);
  
  // Create a simple async iterable
  async function* generateValues() {
    yield 1;
    yield 2;
    yield 3;
  }
  
  // Send values to worker
  await toWorker(worker, generateValues());
  
  // Give worker time to process
  await new Promise(resolve => setTimeout(resolve, 50));
  
  assertEqual(results.length, 3, 'Should send all values to worker');
  assertEqual(
    JSON.stringify(results.map(r => r.received)),
    JSON.stringify([1, 2, 3]),
    'Should receive correct values from worker'
  );
  
  // Worker is auto-terminated by toWorker
}) ? 1 : 0;

// Test 4: Worker error handling
total++;
passed += test('worker error handling', async () => {
  const worker = createWorker(testWorkerFn);
  const messages = fromWorker(worker, {
    onError: 'continue'
  });
  
  // Send a message that will cause an error
  worker.postMessage('error');
  
  // The error should be caught and not crash the test
  await new Promise(resolve => setTimeout(resolve, 50));
  
  worker.terminate();
}) ? 1 : 0;

// Print test results
console.log(`\nTest Results: ${passed}/${total} tests passed`);
process.exit(passed === total ? 0 : 1);
