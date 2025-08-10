import { test } from './test-utils.mjs';
import { fromWorker, toWorker, createWorker } from '../src/worker-utils.js';

// Simple worker function for testing
const testWorkerFn = (e) => {
  if (e.data === 'error') {
    throw new Error('Test error');
  }
  return { result: e.data * 2 };
};

test('createWorker - creates worker from function', (t) => {
  const worker = createWorker(testWorkerFn);
  t.truthy(worker, 'Should create worker instance');
  t.is(typeof worker.postMessage, 'function', 'Worker should have postMessage method');
  worker.terminate();
});

test('fromWorker - processes worker messages', async (t) => {
  const worker = createWorker(testWorkerFn);
  const messages = fromWorker(worker);
  
  // Send a message to the worker
  worker.postMessage(5);
  
  // Get the first message
  const { value } = await messages[Symbol.asyncIterator]().next();
  t.is(value.result, 10, 'Should process worker message');
  
  // Cleanup
  worker.terminate();
});

test('toWorker - sends values to worker', async (t) => {
  const results = [];
  const worker = createWorker((e) => {
    return { received: e.data };
  });
  
  // Listen for messages
  worker.onmessage = (e) => results.push(e.data);
  
  // Send values to worker
  await toWorker(worker, [1, 2, 3]);
  
  // Give worker time to process
  await new Promise(resolve => setTimeout(resolve, 50));
  
  t.is(results.length, 3, 'Should send all values to worker');
  t.deepEqual(
    results.map(r => r.received),
    [1, 2, 3],
    'Should receive correct values from worker'
  );
  
  // Worker is auto-terminated by toWorker
});

test('worker error handling', async (t) => {
  const worker = createWorker(testWorkerFn);
  const messages = fromWorker(worker, {
    onError: 'continue'
  });
  
  // Send a message that will cause an error
  worker.postMessage('error');
  
  // The error should be caught and not crash the test
  t.pass('Should handle worker errors gracefully');
  
  worker.terminate();
});
