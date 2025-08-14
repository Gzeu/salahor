import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

// Directories to clean
const cleanDirs = [
  '**/node_modules',
  '**/dist',
  '**/coverage',
  '**/.turbo',
  '**/.next',
  '**/build',
  '**/.cache',
  '**/temp',
  '**/tmp'
];

// Files to clean
const cleanFiles = [
  '**/*.log',
  '**/*.tmp',
  '**/*.temp',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/npm-debug.log*'
];

async function clean() {
  console.log('🚀 Starting cleanup...');
  
  // Clean directories
  for (const pattern of cleanDirs) {
    const dirs = await glob(pattern, {
      cwd: rootDir,
      dot: true,
      absolute: true,
      onlyDirectories: true,
      ignore: ['**/node_modules/**', '**/dist/**'] // Prevent infinite loops
    });
    
    for (const dir of dirs) {
      console.log(`🧹 Removing directory: ${dir}`);
      try {
        await rm(dir, { recursive: true, force: true });
      } catch (error) {
        console.error(`❌ Error removing ${dir}:`, error.message);
      }
    }
  }
  
  // Clean files
  for (const pattern of cleanFiles) {
    const files = await glob(pattern, {
      cwd: rootDir,
      dot: true,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**']
    });
    
    for (const file of files) {
      console.log(`🧹 Removing file: ${file}`);
      try {
        await rm(file, { force: true });
      } catch (error) {
        console.error(`❌ Error removing ${file}:`, error.message);
      }
    }
  }
  
  console.log('✨ Cleanup complete!');
}

clean().catch(console.error);
