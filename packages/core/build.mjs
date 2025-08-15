import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Clean dist directory
const distDir = join(__dirname, 'dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Get all TypeScript files in src directory (excluding test files)
const srcDir = join(__dirname, 'src');
const files = [];

function findTypeScriptFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip __tests__ directories
      if (entry.name !== '__tests__' && !entry.name.startsWith('.')) {
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
const tscPath = join(__dirname, '..', '..', 'node_modules', '.bin', 'tsc');
const command = `"${tscPath}" ${files.map(f => `"${f}"`).join(' ')} --outDir "${distDir}" --declaration --declarationMap --sourceMap --module esnext --target es2020 --moduleResolution node --esModuleInterop`;

try {
  console.log('Building core package...');
  execSync(command, { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
