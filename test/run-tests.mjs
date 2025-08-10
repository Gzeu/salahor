#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const TEST_TYPES = ['unit', 'performance', 'security', 'edge-cases'];
const CONCURRENCY = 4; // Number of test files to run in parallel
const TIMEOUT = 5 * 60 * 1000; // 5 minutes per test file

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: {}
};

// Get all test files in a directory
async function getTestFiles(dir) {
  try {
    const files = await readdir(dir, { withFileTypes: true });
    return files
      .filter(file => file.isFile() && file.name.endsWith('.mjs'))
      .map(file => join(dir, file.name));
  } catch (error) {
    console.error(`Error reading test directory ${dir}:`, error);
    return [];
  }
}

// Run a single test file
async function runTestFile(file) {
  const startTime = Date.now();
  const testName = file.replace(process.cwd() + '\\', '');
  
  console.log(`\n🚀 Running ${testName}...`);
  
  try {
    const { stdout, stderr } = await execAsync(`node ${file}`, {
      timeout: TIMEOUT,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (stderr) {
      console.error(`❌ ${testName} failed in ${duration.toFixed(2)}s`);
      console.error(stderr);
      return { file, passed: false, duration, error: stderr };
    }
    
    console.log(`✅ ${testName} passed in ${duration.toFixed(2)}s`);
    return { file, passed: true, duration };
    
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`❌ ${testName} failed after ${duration.toFixed(2)}s`);
    console.error(error.stderr || error.message);
    return { file, passed: false, duration, error: error.stderr || error.message };
  }
}

// Run tests in batches with limited concurrency
async function runTestsInBatches(files, batchSize) {
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    await Promise.all(batch.map(runTestFile))
      .then(batchResults => {
        for (const result of batchResults) {
          results.total++;
          if (result.passed) {
            results.passed++;
          } else {
            results.failed++;
          }
          
          const testType = result.file.split(/[\\/]/).find(dir => TEST_TYPES.includes(dir)) || 'other';
          results.details[testType] = results.details[testType] || { passed: 0, failed: 0, total: 0 };
          results.details[testType].total++;
          
          if (result.passed) {
            results.details[testType].passed++;
          } else {
            results.details[testType].failed++;
          }
        }
      });
  }
}

// Print test summary
function printSummary() {
  console.log('\n📊 Test Summary');
  console.log('='.repeat(80));
  
  // Overall stats
  console.log(`\n🏁 Total: ${results.total} | ✅ Passed: ${results.passed} | ❌ Failed: ${results.failed} | ⏩ Skipped: ${results.skipped}`);
  
  // Details by test type
  console.log('\n📋 Details by Test Type:');
  for (const [type, stats] of Object.entries(results.details)) {
    const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`  ${type.padEnd(15)}: ${stats.passed.toString().padStart(4)}/${stats.total} passed (${passRate}%)`);
  }
  
  // Final result
  console.log('\n' + '='.repeat(80));
  if (results.failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else if (results.passed === 0) {
    console.log('⚠️  No tests were run');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting test suite...');
  
  // Find all test files
  const testFiles = [];
  for (const type of TEST_TYPES) {
    const dir = join(__dirname, type);
    const files = await getTestFiles(dir);
    testFiles.push(...files);
  }
  
  if (testFiles.length === 0) {
    console.error('No test files found!');
    process.exit(1);
  }
  
  console.log(`\nFound ${testFiles.length} test files. Starting test execution...`);
  
  // Run tests in batches
  await runTestsInBatches(testFiles, CONCURRENCY);
  
  // Print summary
  printSummary();
}

// Run the tests
main().catch(error => {
  console.error('Unhandled error in test runner:', error);
  process.exit(1);
});
