#!/usr/bin/env node

/**
 * Test script for the Salahor monorepo
 * Runs tests for all packages or specific ones
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('pattern', {
    alias: 'p',
    type: 'string',
    description: 'Pattern to match package names',
    default: '*'  // Default to all packages
  })
  .option('watch', {
    alias: 'w',
    type: 'boolean',
    description: 'Run in watch mode',
    default: false
  })
  .argv;

// Get the root directory
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting tests...\n');

// Get all packages matching the pattern
const packages = getPackagesMatchingPattern(argv.pattern);

if (packages.length === 0) {
  console.log('No packages found matching the pattern.');
  process.exit(0);
}

// Run tests for each package
let failed = false;
for (const pkg of packages) {
  const pkgPath = path.join(rootDir, 'packages', pkg);
  const pkgJsonPath = path.join(pkgPath, 'package.json');
  
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = require(pkgJsonPath);
    
    if (pkgJson.scripts && pkgJson.scripts.test) {
      console.log(`\n📦 Testing ${pkg}...`);
      
      try {
        const testCmd = argv.watch ? 'test:watch' : 'test';
        execSync(`pnpm run ${testCmd}`, {
          cwd: pkgPath,
          stdio: 'inherit',
          env: { ...process.env, FORCE_COLOR: '1' }
        });
        console.log(`✅ Tests passed for ${pkg}`);
      } catch (error) {
        console.error(`❌ Tests failed for ${pkg}`);
        failed = true;
      }
    } else {
      console.log(`ℹ️  No tests found for ${pkg}`);
    }
  }
}

if (failed) {
  console.error('\n❌ Some tests failed');
  process.exit(1);
}

console.log('\n🎉 All tests passed!');

/**
 * Get all packages matching a glob pattern
 */
function getPackagesMatchingPattern(pattern) {
  const glob = require('glob');
  const packageDirs = glob.sync(
    pattern.replace(/\*/g, '**'),
    { cwd: path.join(rootDir, 'packages'), absolute: false }
  );
  
  return packageDirs.filter(dir => 
    fs.existsSync(path.join(rootDir, 'packages', dir, 'package.json'))
  );
}
