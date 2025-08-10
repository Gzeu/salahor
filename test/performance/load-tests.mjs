import { EventEmitter } from 'node:events';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { fromEventEmitter, withQueue, merge, zip } from '../../src/index.js';

// Test configuration
const CONFIG = {
  iterations: 1000,
  concurrency: 100,
  warmupRuns: 10,
  maxMemoryMB: 500, // MB
  maxDurationPerOpMs: 10,
};

// Performance metrics
const metrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  memoryUsage: {
    start: 0,
    end: 0,
    max: 0,
  },
  operations: {
    create: [],
    next: [],
    complete: [],
  },
};

// Measure memory usage
function measureMemory() {
  const mem = process.memoryUsage();
  const usedMB = mem.heapUsed / 1024 / 1024;
  metrics.memoryUsage.max = Math.max(metrics.memoryUsage.max, usedMB);
  return usedMB;
}

// Run a performance test
async function runPerformanceTest(name, testFn) {
  console.log(`\n=== ${name} ===`);
  
  // Warmup
  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    await testFn(i, true);
  }
  
  // Actual test
  const startTime = performance.now();
  metrics.memoryUsage.start = measureMemory();
  
  const results = [];
  for (let i = 0; i < CONFIG.iterations; i++) {
    results.push(await testFn(i, false));
  }
  
  metrics.memoryUsage.end = measureMemory();
  const duration = performance.now() - startTime;
  
  // Calculate metrics
  const opsPerSecond = (CONFIG.iterations / (duration / 1000)).toLocaleString();
  const avgOpTime = (duration / CONFIG.iterations).toFixed(4);
  const memoryGrowth = (metrics.memoryUsage.end - metrics.memoryUsage.start).toFixed(2);
  
  console.log(`Completed ${CONFIG.iterations.toLocaleString()} iterations in ${(duration / 1000).toFixed(2)}s`);
  console.log(`Throughput: ${opsPerSecond} ops/sec`);
  console.log(`Avg time per op: ${avgOpTime}ms`);
  console.log(`Memory usage: ${metrics.memoryUsage.start.toFixed(2)}MB -> ${metrics.memoryUsage.end.toFixed(2)}MB (${memoryGrowth}MB growth)`);
  console.log(`Peak memory: ${metrics.memoryUsage.max.toFixed(2)}MB`);
  
  return {
    name,
    duration,
    opsPerSecond,
    avgOpTime: parseFloat(avgOpTime),
    memoryGrowth: parseFloat(memoryGrowth),
    peakMemory: metrics.memoryUsage.max,
  };
}

// Test scenarios
const tests = [
  {
    name: 'Simple Event Emission',
    async fn(iteration, isWarmup) {
      const emitter = new EventEmitter();
      const it = fromEventEmitter(emitter, 'test');
      
      // Start consuming
      const consumer = it.next();
      
      // Emit event
      emitter.emit('test', iteration);
      
      const { value } = await consumer;
      return value === iteration;
    }
  },
  
  {
    name: 'High Volume Throughput',
    async fn(iteration, isWarmup) {
      const count = 1000;
      const emitter = new EventEmitter();
      const it = fromEventEmitter(emitter, 'volume');
      
      const results = [];
      const consumer = (async () => {
        for await (const value of it) {
          results.push(value);
          if (results.length >= count) break;
        }
      })();
      
      for (let i = 0; i < count; i++) {
        emitter.emit('volume', i);
      }
      
      await consumer;
      return results.length === count && results.every((v, i) => v === i);
    }
  },
  
  {
    name: 'Concurrent Consumers',
    async fn(iteration, isWarmup) {
      const consumerCount = 10;
      const eventCount = 100;
      const emitter = new EventEmitter();
      
      const consumers = [];
      const allResults = [];
      
      // Create consumers
      for (let i = 0; i < consumerCount; i++) {
        const results = [];
        allResults.push(results);
        
        const it = fromEventEmitter(emitter, `concurrent-${i}`);
        
        consumers.push((async () => {
          for await (const value of it) {
            results.push(value);
            if (results.length >= eventCount) break;
          }
        })());
      }
      
      // Emit events
      for (let i = 0; i < eventCount; i++) {
        for (let j = 0; j < consumerCount; j++) {
          emitter.emit(`concurrent-${j}`, i);
        }
      }
      
      await Promise.all(consumers);
      
      // Verify all consumers got all events
      return allResults.every(results => 
        results.length === eventCount && 
        results.every((v, i) => v === i)
      );
    }
  },
  
  {
    name: 'Backpressure Handling',
    async fn(iteration, isWarmup) {
      const queueSize = 10;
      const emitter = new EventEmitter();
      
      // Create a queue with limited size
      const queued = withQueue({ queueLimit: queueSize, onOverflow: 'drop-old' })(
        fromEventEmitter(emitter, 'backpressure')
      );
      
      // Start consuming slowly
      const consumer = (async () => {
        const results = [];
        for await (const value of queued) {
          results.push(value);
          await new Promise(resolve => setTimeout(resolve, 10)); // Slow consumer
          if (results.length >= queueSize * 2) break;
        }
        return results;
      })();
      
      // Emit more events than the queue can hold
      for (let i = 0; i < queueSize * 2; i++) {
        emitter.emit('backpressure', i);
      }
      
      const results = await consumer;
      
      // Should have the most recent events due to 'drop-old' policy
      return (
        results.length === queueSize * 2 &&
        results.every((v, i) => v >= queueSize) // Should only have the last 'queueSize' events
      );
    }
  }
];

// Run all performance tests
async function runAllTests() {
  console.log('Starting performance tests...');
  console.log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`\nRunning test: ${test.name}`);
      const result = await runPerformanceTest(test.name, test.fn);
      results.push(result);
      
      // Check against thresholds
      if (result.avgOpTime > CONFIG.maxDurationPerOpMs) {
        console.warn(`⚠️  Warning: Average operation time (${result.avgOpTime}ms) exceeds threshold (${CONFIG.maxDurationPerOpMs}ms)`);
      }
      
      if (result.peakMemory > CONFIG.maxMemoryMB) {
        console.warn(`⚠️  Warning: Peak memory usage (${result.peakMemory.toFixed(2)}MB) exceeds threshold (${CONFIG.maxMemoryMB}MB)`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${test.name}`, error);
      results.push({
        name: test.name,
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  // Print summary
  console.log('\n=== Performance Test Summary ===');
  console.table(results.map(r => ({
    'Test': r.name,
    'Avg Time (ms)': r.avgOpTime?.toFixed(4) || 'N/A',
    'Ops/Sec': r.opsPerSecond || 'N/A',
    'Mem Growth (MB)': r.memoryGrowth?.toFixed(2) || 'N/A',
    'Peak Mem (MB)': r.peakMemory?.toFixed(2) || 'N/A',
    'Status': r.error ? '❌ Failed' : '✅ Passed'
  })));
  
  // Check for failures
  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    console.error('\n❌ Some tests failed:');
    for (const fail of failed) {
      console.error(`\n${fail.name}: ${fail.error}`);
      if (fail.stack) {
        console.error(fail.stack.split('\n').slice(0, 3).join('\n') + '...');
      }
    }
    process.exit(1);
  }
  
  console.log('\n✅ All performance tests completed successfully!');
}

// Run the tests
runAllTests().catch(console.error);
