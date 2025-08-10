/**
 * Test utilities for uniconnect
 * Provides a simple testing framework with zero dependencies
 */

// Test state
let testCount = 0;
let passCount = 0;
let currentTest = '';

// Test result tracking
const testResults = [];

// Test timer
const testTimers = new Map();

/**
 * Test function that runs async tests
 * @param {string} name - Test name
 * @param {Function} fn - Test function (can be async)
 */
export function test(name, fn, timeout = 5000) {
  testCount++;
  currentTest = name;
  
  const testStart = Date.now();
  let testTimeout;
  
  const handleError = (error) => {
    const duration = Date.now() - testStart;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    testResults.push({
      name: currentTest,
      passed: false,
      error: errorMessage,
      stack: errorStack,
      duration
    });
    
    console.error(`❌ ${currentTest} (${duration}ms) failed:`);
    console.error(`  ${errorMessage}`);
    
    if (errorStack) {
      console.error(errorStack.split('\n').slice(0, 5).join('\n'));
    }
  };
  
  const runTest = async () => {
    const testContext = {
      // Assertions
      is: (actual, expected, message = '') => {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}${message ? ': ' + message : ''}`);
        }
      },
      
      isNot: (actual, expected, message = '') => {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}${message ? ': ' + message : ''}`);
        }
      },
      
      truthy: (value, message = '') => {
        if (!value) {
          throw new Error(`Expected value to be truthy${message ? ': ' + message : ''}. Got: ${JSON.stringify(value)}`);
        }
      },
      
      falsy: (value, message = '') => {
        if (value) {
          throw new Error(`Expected value to be falsy${message ? ': ' + message : ''}. Got: ${JSON.stringify(value)}`);
        }
      },
      
      throws: async (fn, errorMatcher, message = '') => {
        let errorThrown = false;
        try {
          const result = fn();
          if (result && typeof result.then === 'function') {
            await result;
          }
        } catch (error) {
          errorThrown = true;
          if (errorMatcher) {
            if (typeof errorMatcher === 'function' && !(error instanceof errorMatcher)) {
              throw new Error(`Expected error to be instance of ${errorMatcher.name}, got ${error.constructor.name}: ${error.message}`);
            } else if (typeof errorMatcher === 'string' && !error.message.includes(errorMatcher)) {
              throw new Error(`Expected error message to contain "${errorMatcher}", got: ${error.message}`);
            } else if (errorMatcher instanceof RegExp && !errorMatcher.test(error.message)) {
              throw new Error(`Expected error message to match ${errorMatcher}, got: ${error.message}`);
            }
          }
          return error;
        }
        
        if (!errorThrown) {
          throw new Error(`Expected function to throw${message ? ': ' + message : ''}`);
        }
      },
      
      notThrows: async (fn, message = '') => {
        try {
          const result = fn();
          if (result && typeof result.then === 'function') {
            await result;
          }
        } catch (error) {
          throw new Error(`Expected function not to throw but it threw ${error.constructor.name}: ${error.message}${message ? ': ' + message : ''}`);
        }
      },
      
      deepEqual: (actual, expected, message = '') => {
        const actualJson = JSON.stringify(actual);
        const expectedJson = JSON.stringify(expected);
        if (actualJson !== expectedJson) {
          throw new Error(`Expected ${actualJson} to deeply equal ${expectedJson}${message ? ': ' + message : ''}`);
        }
      },
      
      // Test control
      pass: (message = '') => {
        const duration = Date.now() - testStart;
        testResults.push({
          name: currentTest,
          passed: true,
          duration,
          message
        });
        console.log(`✅ ${currentTest} (${duration}ms)${message ? ': ' + message : ''}`);
        passCount++;
      },
      
      fail: (message = '') => {
        throw new Error(`Test failed${message ? ': ' + message : ''}`);
      },
      
      // Type checking
      isA: (value, constructor, message = '') => {
        if (!(value instanceof constructor)) {
          throw new Error(`Expected ${value} to be instance of ${constructor.name}${message ? ': ' + message : ''}`);
        }
      },
      
      // Async utilities
      setTimeout: (fn, ms) => new Promise(resolve => {
        const timer = setTimeout(() => {
          resolve(fn());
        }, ms);
        testTimers.set(timer, setTimeout(() => {
          testTimers.delete(timer);
        }, ms));
      }),
      
      // Test context
      test: {
        name: currentTest,
        startTime: testStart,
        timeout: (ms) => {
          if (testTimeout) clearTimeout(testTimeout);
          testTimeout = setTimeout(() => {
            throw new Error(`Test timed out after ${ms}ms`);
          }, ms);
        }
      }
    };
    
    // Set test timeout
    if (timeout) {
      testTimeout = setTimeout(() => {
        throw new Error(`Test "${currentTest}" timed out after ${timeout}ms`);
      }, timeout);
    }
    
    try {
      const result = fn(testContext);
      
      if (result && typeof result.then === 'function') {
        await result;
      }
      
      if (testTimeout) clearTimeout(testTimeout);
      
      // If we got here and the test didn't call pass() or fail(), assume it passed
      if (!testResults.some(r => r.name === currentTest)) {
        const duration = Date.now() - testStart;
        testResults.push({
          name: currentTest,
          passed: true,
          duration
        });
        console.log(`✅ ${currentTest} (${duration}ms)`);
        passCount++;
      }
    } catch (error) {
      if (testTimeout) clearTimeout(testTimeout);
      throw error;
    }
  };
  
  // Run the test
  const testPromise = runTest();
  
  // Handle async tests
  if (testPromise && typeof testPromise.then === 'function') {
    return testPromise.catch(handleError);
  }
}

// Run tests and show summary
process.on('beforeExit', () => {
  console.log('\nTest Summary:');
  console.log(`  ${passCount} passed`);
  console.log(`  ${testCount - passCount} failed`);
  console.log(`  ${testCount} total\n`);
  
  if (passCount < testCount) {
    process.exit(1);
  }
});

// Helper to create a delay
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to create an async iterable from an array
export async function* fromArray(array) {
  for (const item of array) {
    yield item;
  }
}

// Helper to collect all values from an async iterable
export async function collect(iterable) {
  const result = [];
  for await (const value of iterable) {
    result.push(value);
  }
  return result;
}
