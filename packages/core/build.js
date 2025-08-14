const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Get all TypeScript files in src directory (excluding test files)
const srcDir = path.join(__dirname, 'src');
const files = [];

function findTypeScriptFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip __tests__ directories
      if (entry.name !== '__tests__') {
        findTypeScriptFiles(fullPath);
      }
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
}

findTypeScriptFiles(srcDir);

if (files.length === 0) {
  console.error('No TypeScript files found in src directory');
  process.exit(1);
}

// Build command
const tscPath = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'tsc');
const command = `"${tscPath}" ${files.map(f => `"${f}"`).join(' ')} --outDir "${distDir}" --declaration --declarationMap --sourceMap --module esnext --target es2020 --moduleResolution node --esModuleInterop`;

try {
  console.log('Building core package...');
  execSync(command, { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
