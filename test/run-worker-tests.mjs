#!/usr/bin/env node

/**
 * Test runner for worker tests
 * Runs all worker-related tests and provides a summary
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { test } from './test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  startTime: Date.now()
};

// ANSI colors for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

// Import and run the worker tests
async function runWorkerTests() {
  console.log('\nRunning worker tests...\n');
  
  try {
    // Import worker tests
    const { default: workerTests } = await import('./worker-test.mjs');
    
    // Wait for all tests to complete
    await new Promise(resolve => setImmediate(resolve));
    
    console.log('\nWorker tests completed!');
  } catch (error) {
    console.error('Error running worker tests:', error);
    process.exitCode = 1;
  }
}

// Run the tests
runWorkerTests().then(() => {
  // Print summary
  const duration = Date.now() - results.startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log(' TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}✗ ${results.failed} test${results.failed === 1 ? '' : 's'} failed${colors.reset}`);
  }
  
  if (results.passed > 0) {
    console.log(`${colors.green}✓ ${results.passed} test${results.passed === 1 ? '' : 's'} passed${colors.reset}`);
  }
  
  console.log(`\n${results.total} test${results.total === 1 ? '' : 's'}`);
  console.log(`Time: ${duration}ms`);
  
  // Exit with appropriate code
  if (results.failed > 0) {
    process.exit(1);
  }
}).catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});
