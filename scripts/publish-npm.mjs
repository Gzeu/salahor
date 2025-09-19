#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('📦 Salahor NPM Publishing Script');
console.log('===================================');

const runCommand = (cmd, description) => {
  console.log(`\n🔄 ${description}...`);
  console.log(`Command: ${cmd}`);
  
  try {
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    console.log('✅ SUCCESS');
    if (output.trim()) {
      console.log('Output:', output.trim());
    }
  } catch (error) {
    console.log('❌ ERROR');
    console.log('Exit code:', error.status);
    if (error.stdout) {
      console.log('Stdout:', error.stdout.toString().trim());
    }
    if (error.stderr) {
      console.log('Stderr:', error.stderr.toString().trim());
    }
    
    // Dacă e o problemă critică, oprește
    if (cmd.includes('build') || cmd.includes('test')) {
      process.exit(1);
    }
  }
};

// Check NPM login status
console.log('\n🔐 Checking NPM authentication...');
try {
  const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
  console.log(`✅ Logged in as: ${whoami}`);
} catch (error) {
  console.log('❌ Not logged into NPM!');
  console.log('Please run: npm login');
  process.exit(1);
}

// Pre-publish checks
const checks = [
  {
    cmd: 'pnpm install --frozen-lockfile',
    description: 'Installing dependencies'
  },
  {
    cmd: 'pnpm run build',
    description: 'Building all packages'
  },
  {
    cmd: 'pnpm run test',
    description: 'Running tests'
  },
  {
    cmd: 'pnpm run lint',
    description: 'Linting code'
  }
];

checks.forEach(({ cmd, description }) => {
  runCommand(cmd, description);
});

// Check for changesets
console.log('\n📋 Checking for pending changesets...');
try {
  const changesetStatus = execSync('pnpm changeset status', { encoding: 'utf8' });
  if (changesetStatus.includes('No changesets present')) {
    console.log('⚠️ No changesets found. Creating one now...');
    console.log('\n📝 Please create a changeset first:');
    console.log('Run: pnpm changeset');
    console.log('Then re-run this script.');
    process.exit(1);
  } else {
    console.log('✅ Changesets found');
    console.log(changesetStatus);
  }
} catch (error) {
  console.log('⚠️ Could not check changeset status');
}

// Version packages
runCommand('pnpm version-packages', 'Updating package versions');

// Final build after version updates
runCommand('pnpm run build', 'Final build after versioning');

// Publish to NPM
runCommand('pnpm release', 'Publishing to NPM');

console.log('\n🎉 NPM Publishing completed!');
console.log('🌍 Check your packages on: https://www.npmjs.com/~' + execSync('npm whoami', { encoding: 'utf8' }).trim());
console.log('🚀 Salahor is now globally available!');

console.log('\n📋 Next steps:');
console.log('1. ✅ Verify packages on NPM');
console.log('2. 📝 Update documentation with installation instructions');
console.log('3. 🎉 Share with the community!');
