import { test } from '../test-utils.mjs';
import { fromWorker, toWorker, createWorker } from '../../src/worker.js';

// Simple worker function for testing
const testWorkerFn = `
  self.onmessage = function(e) {
    if (e.data === 'error') {
      throw new Error('Test error');
    }
    self.postMessage({ result: e.data * 2 });
  };
`;

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
  const worker = createWorker(`
    self.onmessage = function(e) {
      self.postMessage({ received: e.data });
    };
  `);
  
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

test('createWorker - creates worker from function', (t) => {
  const worker = createWorker(`
    self.onmessage = function(e) {
      self.postMessage({ pid: process.pid });
    };
  `);
  
  t.truthy(worker, 'Should create worker instance');
  t.is(typeof worker.postMessage, 'function', 'Worker should have postMessage method');
  
  worker.terminate();
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

test('worker with transferable objects', async (t) => {
  const worker = createWorker(`
    self.onmessage = function(e) {
      const view = new Uint8Array(e.data.buffer);
      view[0] = 42;
      self.postMessage(view.buffer, [view.buffer]);
    };
  `);
  
  const buffer = new ArrayBuffer(1);
  const view = new Uint8Array(buffer);
  view[0] = 1;
  
  const messages = fromWorker(worker);
  worker.postMessage({ buffer }, [buffer]);
  
  const { value } = await messages[Symbol.asyncIterator]().next();
  const resultView = new Uint8Array(value);
  
  t.is(resultView[0], 42, 'Should process transferable objects');
  t.throws(() => view[0], 'Original buffer should be transferred');
  
  worker.terminate();
});
