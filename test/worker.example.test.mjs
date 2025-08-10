/**
 * Test file for worker infrastructure
 * Demonstrates how to use the worker utilities
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runInWorker, getWorkerSupport } from '../src/workers/main.mjs';
import { runTask, logWorkerSupport, getWorkerSupportInfo } from '../src/workers/bridge.mjs';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the example worker
const workerPath = join(__dirname, '../src/workers/example.worker.mjs');

// Test data
const testData = {
  name: 'Test Worker',
  value1: 42,
  value2: 3.14,
  items: ['a', 'b', 'c'],
};

// Custom logger for tests
const testLogger = {
  logs: [],
  log(...args) {
    const message = args.join(' ');
    this.logs.push({ type: 'log', message });
    console.log(...args);
  },
  warn(...args) {
    const message = args.join(' ');
    this.logs.push({ type: 'warn', message });
    console.warn(...args);
  },
  error(...args) {
    const message = args.join(' ');
    this.logs.push({ type: 'error', message });
    console.error(...args);
  },
  clear() {
    this.logs = [];
  }
};

/**
 * Test the worker infrastructure
 */
async function testWorkerInfrastructure() {
  console.log('Testing worker infrastructure...');
  
  // Log worker support information
  logWorkerSupport(testLogger);
  
  // Get detailed worker support info
  const workerSupport = getWorkerSupportInfo();
  
  // Skip worker tests if not supported
  const shouldTestWorkers = workerSupport.supported;
  
  // Test 1: Basic worker execution (only if workers are supported)
  console.log('\nTest 1: Basic worker execution');
  if (shouldTestWorkers) {
    try {
      console.log('Running task in worker thread...');
      const result = await runInWorker(workerPath, testData);
      console.log('✅ Worker result:', JSON.stringify(result.data, null, 2));
      console.log('✅ Test 1 passed');
    } catch (error) {
      console.error('❌ Test 1 failed:', error);
    }
  } else {
    console.log('ℹ️  Skipping worker test - workers not supported in this environment');
  }
  
  // Test 2: Using the bridge with worker (with fallback)
  console.log('\nTest 2: Using the bridge with worker (with fallback)');
  try {
    // This would be the task function that runs in the main thread if workers aren't available
    const task = (data) => {
      console.log('Running task in main thread (fallback)');
      return {
        input: data,
        processedAt: new Date().toISOString(),
        computed: {
          sum: Object.values(data).reduce((sum, val) => {
            const num = Number(val);
            return !isNaN(num) ? sum + num : sum;
          }, 0),
          propertyCount: Object.keys(data).length,
        },
      };
    };
    
    let fallbackTriggered = false;
    
    const result = await runTask(task, testData, {
      useWorker: shouldTestWorkers, // Only try worker if supported
      workerModule: workerPath,
      onFallback: (reason) => {
        console.log(`ℹ️  Fallback to main thread: ${reason.message}`);
        fallbackTriggered = true;
      },
      onWorkerError: (error) => {
        console.warn('⚠️  Worker error:', error.message);
      }
    });
    
    console.log('✅ Bridge result:', JSON.stringify(result, null, 2));
    console.log(`✅ Test 2 passed (${fallbackTriggered ? 'used fallback' : 'used worker'})`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }
  
  // Test 3: Force fallback to main thread
  console.log('\nTest 3: Force fallback to main thread');
  try {
    let fallbackTriggered = false;
    
    const task = (data) => {
      console.log('Running task in main thread (forced)');
      return {
        input: data,
        processedAt: new Date().toISOString(),
        computed: {
          sum: Object.values(data).reduce((sum, val) => {
            const num = Number(val);
            return !isNaN(num) ? sum + num : sum;
          }, 0),
          propertyCount: Object.keys(data).length,
        },
      };
    };
    
    const result = await runTask(task, testData, {
      useWorker: false, // Force main thread execution
      onFallback: () => {
        fallbackTriggered = true;
      }
    });
    
    if (fallbackTriggered) {
      console.log('✅ Fallback was triggered as expected');
    } else {
      console.log('✅ Task completed in main thread');
    }
    
    console.log('✅ Main thread result:', JSON.stringify(result, null, 2));
    console.log('✅ Test 3 passed');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
}

// Run the tests
testWorkerInfrastructure()
  .then(() => console.log('\nAll tests completed'))
  .catch(console.error);
