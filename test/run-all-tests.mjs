#!/usr/bin/env node

/**
 * Test runner for uniconnect
 * Runs all test suites and provides a summary
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, stat } from 'fs/promises';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: 0,
  startTime: Date.now()
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Test status symbols
const symbols = {
  pass: '✓',
  fail: '✗',
  skip: '-'
};

/**
 * Find all test files in a directory
 */
async function findTestFiles(dir) {
  const testFiles = [];
  
  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      // Skip node_modules and other non-test directories
      if (file === 'node_modules' || file.startsWith('.')) {
        continue;
      }
      
      const fullPath = join(dir, file);
      const fileStat = await stat(fullPath);
      
      if (fileStat.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findTestFiles(fullPath);
        testFiles.push(...subFiles);
      } else if (file.endsWith('.mjs')) {
        // Include all .mjs files in test directories
        testFiles.push(fullPath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }
  
  return testFiles;
}

/**
 * Run a single test file
 */
async function runTestFile(filePath) {
  try {
    // Store the original console methods
    const originalConsole = {
      log: console.log,
      error: console.error
    };
    
    // Capture test output
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalConsole.log(...args);
    };
    
    console.error = (...args) => {
      output += args.join(' ') + '\n';
      originalConsole.error(...args);
    };
    
    // Convert Windows paths to file:// URLs
    let importPath = filePath;
    if (process.platform === 'win32') {
      if (!filePath.startsWith('file://')) {
        importPath = `file://${filePath.replace(/\\/g, '/')}`;
      }
    }
    
    // Import the test file
    await import(importPath);
    
    // Wait for any pending operations
    await new Promise(resolve => setImmediate(resolve));
    
    // Restore console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    
    return { passed: true, output };
  } catch (error) {
    return { 
      passed: false, 
      error,
      output: error.stack || error.message
    };
  }
}

/**
 * Format test duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print test results
 */
function printResults() {
  const duration = Date.now() - results.startTime;
  
  console.log('\n' + '='.repeat(80));
  console.log(' TEST RESULTS');
  console.log('='.repeat(80));
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}${symbols.fail} ${results.failed} test${results.failed === 1 ? '' : 's'} failed${colors.reset}`);
  }
  
  if (results.passed > 0) {
    console.log(`${colors.green}${symbols.pass} ${results.passed} test${results.passed === 1 ? '' : 's'} passed${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}Suites:${colors.reset} ${results.suites}`);
  console.log(`${colors.bright}Tests:${colors.reset}  ${results.total}`);
  console.log(`${colors.bright}Time:${colors.reset}   ${formatDuration(duration)}`);
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Find all test files
    const testDir = join(__dirname, '..', 'test');
    const testFiles = await findTestFiles(testDir);
    
    if (testFiles.length === 0) {
      console.error('No test files found');
      process.exit(1);
    }
    
    console.log(`\n${colors.cyan}Found ${testFiles.length} test file${testFiles.length === 1 ? '' : 's'}${colors.reset}\n`);
    
    // Run each test file
    for (const file of testFiles) {
      const relativePath = file.replace(process.cwd() + '/', '');
      console.log(`${colors.dim}${relativePath}${colors.reset}`);
      
      const result = await runTestFile(file);
      results.suites++;
      
      if (result.passed) {
        console.log(`${colors.green}${symbols.pass} ${relativePath}${colors.reset}`);
        results.passed++;
      } else {
        console.log(`${colors.red}${symbols.fail} ${relativePath}${colors.reset}`);
        console.log(result.output);
        results.failed++;
      }
      
      console.log();
    }
    
    results.total = results.passed + results.failed;
    printResults();
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
main();
