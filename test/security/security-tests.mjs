import { EventEmitter } from 'node:events';
import { fromEventTarget, fromEventEmitter, withQueue, QUEUE_POLICIES } from '../../src/index.js';
import { ValidationError, QueueOverflowError, AbortError } from '../../src/index.js';

// Test configuration
const TEST_ITERATIONS = 1000;
const CONCURRENCY_LEVEL = 100;

// Utility function to test for memory leaks
async function testForMemoryLeaks(testFn, iterations = 1000) {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    await testFn(i);
    
    // Check memory usage periodically
    if (i % 100 === 0 && i > 0) {
      const currentMem = process.memoryUsage().heapUsed;
      const memoryGrowth = ((currentMem - startMem) / startMem) * 100;
      
      if (memoryGrowth > 10) { // More than 10% growth is suspicious
        console.warn(`⚠️  Memory growth detected after ${i} iterations: ${memoryGrowth.toFixed(2)}%`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }
  
  const endMem = process.memoryUsage().heapUsed;
  const duration = Date.now() - startTime;
  const memoryGrowth = ((endMem - startMem) / startMem) * 100;
  
  console.log(`Memory test completed in ${duration}ms`);
  console.log(`Memory usage: ${(startMem / 1024 / 1024).toFixed(2)}MB -> ${(endMem / 1024 / 1024).toFixed(2)}MB (${memoryGrowth > 0 ? '+' : ''}${memoryGrowth.toFixed(2)}%)`);
  
  return {
    iterations,
    duration,
    startMemory: startMem,
    endMemory: endMem,
    memoryGrowth,
    memoryGrowthPercent: memoryGrowth
  };
}

// Security test suite
describe('Security Tests', () => {
  describe('Input Validation', () => {
    it('should reject invalid event targets', () => {
      assert.throws(() => fromEventTarget(null, 'test'), ValidationError);
      assert.throws(() => fromEventTarget(undefined, 'test'), ValidationError);
      assert.throws(() => fromEventTarget({}, 'test'), ValidationError);
      
      // Invalid event names
      assert.throws(() => fromEventTarget(new EventTarget(), ''), ValidationError);
      assert.throws(() => fromEventTarget(new EventTarget(), null), ValidationError);
      assert.throws(() => fromEventTarget(new EventTarget(), 123), ValidationError);
    });
    
    it('should reject invalid queue limits', () => {
      assert.throws(
        () => fromEventTarget(new EventTarget(), 'test', { queueLimit: -1 }), 
        ValidationError
      );
      
      assert.throws(
        () => fromEventTarget(new EventTarget(), 'test', { queueLimit: 'invalid' }), 
        ValidationError
      );
    });
    
    it('should reject invalid overflow policies', () => {
      assert.throws(
        () => fromEventTarget(new EventTarget(), 'test', { onOverflow: 'invalid' }),
        ValidationError
      );
    });
  });
  
  describe('Memory Safety', () => {
    it('should not leak memory with rapid connect/disconnect', async () => {
      const result = await testForMemoryLeaks(async (i) => {
        const emitter = new EventEmitter();
        const it = fromEventEmitter(emitter, `leak-test-${i}`);
        
        // Emit some events
        emitter.emit(`leak-test-${i}`, 'test');
        
        // Consume the event
        await it.next();
        
        // Force cleanup
        if (it.return) await it.return();
      }, TEST_ITERATIONS);
      
      // Fail if memory growth is too high
      assert(
        result.memoryGrowthPercent < 10,
        `Memory growth too high: ${result.memoryGrowthPercent.toFixed(2)}%`
      );
    });
    
    it('should handle queue overflow safely', async () => {
      const emitter = new EventEmitter();
      const queueSize = 10;
      const it = fromEventEmitter(emitter, 'overflow-test', {
        queueLimit: queueSize,
        onOverflow: 'throw'
      });
      
      // Fill the queue
      for (let i = 0; i < queueSize; i++) {
        emitter.emit('overflow-test', i);
      }
      
      // Next emit should cause overflow
      assert.throws(
        () => emitter.emit('overflow-test', 'overflow'),
        QueueOverflowError
      );
    });
  });
  
  describe('Concurrency Safety', () => {
    it('should handle concurrent operations safely', async () => {
      const testCount = 100;
      const promises = [];
      
      for (let i = 0; i < CONCURRENCY_LEVEL; i++) {
        const testFn = async () => {
          const emitter = new EventEmitter();
          const it = fromEventEmitter(emitter, `concurrent-${i}`);
          
          // Start consuming
          const consumer = (async () => {
            const results = [];
            for await (const value of it) {
              results.push(value);
              if (results.length >= testCount) break;
            }
            return results;
          })();
          
          // Emit events
          for (let j = 0; j < testCount; j++) {
            emitter.emit(`concurrent-${i}`, j);
          }
          
          const results = await consumer;
          
          // Verify all events were received in order
          assert.strictEqual(results.length, testCount);
          for (let j = 0; j < testCount; j++) {
            assert.strictEqual(results[j], j);
          }
        };
        
        promises.push(testFn());
      }
      
      await Promise.all(promises);
    });
  });
  
  describe('Resource Cleanup', () => {
    it('should clean up resources on abort', async () => {
      const controller = new AbortController();
      const emitter = new EventEmitter();
      
      // Spy on add/remove listener
      const addSpy = jest.spyOn(emitter, 'on');
      const removeSpy = jest.spyOn(emitter, 'off');
      
      const it = fromEventEmitter(emitter, 'abort-test', {
        signal: controller.signal
      });
      
      // Start consuming
      const consumer = it.next();
      
      // Abort
      controller.abort();
      
      // Should reject with AbortError
      await assert.rejects(consumer, AbortError);
      
      // Verify cleanup
      assert.strictEqual(removeSpy.mock.calls.length, 2); // For both event and error listeners
      
      // Clean up
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});

// Run the tests
(async () => {
  try {
    // Run all test suites
    await Promise.all([
      import('./security/security-tests.mjs')
    ]);
    
    console.log('All security tests passed!');
  } catch (err) {
    console.error('Security tests failed:', err);
    process.exit(1);
  }
})();
