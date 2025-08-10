import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import {
  fromEventTarget,
  fromEventEmitter,
  withQueue,
  QUEUE_POLICIES,
  merge,
  zip,
  debounceTime,
  throttleTime,
  map,
  filter,
  take,
  buffer,
  scan,
  distinctUntilChanged,
  timeout,
  toEventEmitter,
  UniconnectError,
  AbortError,
  QueueOverflowError,
  ValidationError,
  NotSupportedError
} from '../../src/index.js';

// Test configuration
const TEST_ITERATIONS = 1000;
const CONCURRENCY_LEVEL = 100;
const PERFORMANCE_THRESHOLD_MS = 100; // Max allowed time per operation in ms

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test suite
describe('Uniconnect Core Tests', () => {
  describe('Basic Functionality', () => {
    it('should create from EventTarget', async () => {
      const target = new EventTarget();
      const it = fromEventTarget(target, 'test');
      
      setTimeout(() => {
        target.dispatchEvent(new Event('test', { data: 'test' }));
      }, 10);
      
      const { value } = await it.next();
      assert.strictEqual(value.type, 'test');
    });

    it('should create from EventEmitter', async () => {
      const emitter = new EventEmitter();
      const it = fromEventEmitter(emitter, 'test');
      
      setTimeout(() => {
        emitter.emit('test', 'test');
      }, 10);
      
      const { value } = await it.next();
      assert.strictEqual(value, 'test');
    });
  });

  describe('Queue Behavior', () => {
    it('should respect queue limits', async () => {
      const emitter = new EventEmitter();
      const it = fromEventEmitter(emitter, 'test', {
        queueLimit: 5,
        onOverflow: 'drop-old'
      });
      
      // Emit more events than queue can hold
      for (let i = 0; i < 10; i++) {
        emitter.emit('test', i);
      }
      
      // Should only have the last 5 events
      const values = [];
      for (let i = 0; i < 5; i++) {
        const { value } = await it.next();
        values.push(value);
      }
      
      assert.deepStrictEqual(values, [5, 6, 7, 8, 9]);
    });
  });

  describe('Error Handling', () => {
    it('should handle aborted operations', async () => {
      const controller = new AbortController();
      const emitter = new EventEmitter();
      const it = fromEventEmitter(emitter, 'test', {
        signal: controller.signal
      });
      
      controller.abort();
      
      try {
        await it.next();
        assert.fail('Should have thrown AbortError');
      } catch (err) {
        assert(err instanceof AbortError);
      }
    });
  });
});

// Performance test suite
describe('Performance Tests', () => {
  it(`should handle ${TEST_ITERATIONS} events under ${PERFORMANCE_THRESHOLD_MS}ms each`, async () => {
    const emitter = new EventEmitter();
    const start = performance.now();
    
    const results = [];
    const it = fromEventEmitter(emitter, 'perf');
    
    // Start consuming
    const consumer = (async () => {
      for await (const value of it) {
        results.push(value);
        if (results.length >= TEST_ITERATIONS) break;
      }
    })();
    
    // Generate test events
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      emitter.emit('perf', i);
      // Small delay to simulate real-world conditions
      if (i % 10 === 0) await sleep(0);
    }
    
    await consumer;
    const duration = performance.now() - start;
    const avgTime = duration / TEST_ITERATIONS;
    
    console.log(`Processed ${TEST_ITERATIONS} events in ${duration.toFixed(2)}ms (${avgTime.toFixed(4)}ms/op)`);
    assert(avgTime < PERFORMANCE_THRESHOLD_MS, `Average time per operation (${avgTime.toFixed(4)}ms) exceeds threshold (${PERFORMANCE_THRESHOLD_MS}ms)`);
    assert.strictEqual(results.length, TEST_ITERATIONS);
  });

  it(`should handle ${CONCURRENCY_LEVEL} concurrent consumers`, async () => {
    const emitter = new EventEmitter();
    const testCount = 100;
    const results = [];
    
    // Create multiple consumers
    const consumers = Array.from({ length: CONCURRENCY_LEVEL }, async (_, i) => {
      const it = fromEventEmitter(emitter, `concurrent-${i}`);
      const values = [];
      
      for (let j = 0; j < testCount; j++) {
        const { value } = await it.next();
        values.push(value);
      }
      
      results.push(...values);
    });
    
    // Emit events to all consumers
    for (let i = 0; i < testCount; i++) {
      for (let j = 0; j < CONCURRENCY_LEVEL; j++) {
        emitter.emit(`concurrent-${j}`, `data-${i}-${j}`);
      }
      if (i % 10 === 0) await sleep(0);
    }
    
    await Promise.all(consumers);
    assert.strictEqual(results.length, CONCURRENCY_LEVEL * testCount);
  });
});

// Security test suite
describe('Security Tests', () => {
  it('should handle malicious input safely', async () => {
    // Test with null/undefined inputs
    assert.throws(() => fromEventTarget(null, 'test'), ValidationError);
    assert.throws(() => fromEventEmitter(undefined, 'test'), ValidationError);
    
    // Test with invalid queue limits
    assert.throws(() => fromEventTarget({}, 'test', { queueLimit: -1 }), ValidationError);
    
    // Test with invalid overflow policies
    assert.throws(
      () => fromEventTarget({}, 'test', { onOverflow: 'invalid' }),
      ValidationError
    );
  });
  
  it('should not leak memory on rapid connect/disconnect', async () => {
    const startMem = process.memoryUsage().heapUsed;
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const emitter = new EventEmitter();
      const it = fromEventEmitter(emitter, 'leak-test');
      emitter.emit('leak-test', 'data');
      await it.next();
      // Force cleanup
      if (it.return) await it.return();
      
      if (i % 100 === 0) {
        // Check memory growth
        const currentMem = process.memoryUsage().heapUsed;
        const growth = (currentMem - startMem) / startMem;
        assert(growth < 0.1, `Memory growth too high: ${(growth * 100).toFixed(2)}%`);
      }
    }
  });
});

// Run the tests
(async () => {
  try {
    // Run all test suites
    await Promise.all([
      // Add more test files as needed
      import('./unit/basic-tests.mjs')
    ]);
    console.log('All tests passed!');
  } catch (err) {
    console.error('Tests failed:', err);
    process.exit(1);
  }
})();
