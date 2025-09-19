#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🔧 Salahor Auto-Fix Script');
console.log('========================');

const commands = [
  {
    name: '📝 Format all files with Prettier',
    cmd: 'pnpm run format',
    description: 'Auto-fix formatting issues'
  },
  {
    name: '🧹 ESLint auto-fix',
    cmd: 'pnpm run lint -- --fix',
    description: 'Auto-fix ESLint issues'
  },
  {
    name: '✅ Final lint check',
    cmd: 'pnpm run lint',
    description: 'Verify all issues are resolved'
  }
];

for (const { name, cmd, description } of commands) {
  console.log(`\n${name}`);
  console.log(`Command: ${cmd}`);
  console.log(`Description: ${description}`);
  
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
      console.log('Stdout:', error.stdout.toString());
    }
    if (error.stderr) {
      console.log('Stderr:', error.stderr.toString());
    }
    
    // Pentru ultima comandă (verificare), nu oprim scriptul
    if (cmd.includes('-- --fix')) {
      console.log('⚠️ Continuă cu verificarea finală...');
    }
  }
}

console.log('\n🎉 Auto-fix script completed!');
console.log('Check the output above to see if manual fixes are needed.');
