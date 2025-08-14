#!/usr/bin/env node

/**
 * Script to create a new package in the monorepo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Get package name and type from command line arguments
const [packageName, packageType = 'library'] = process.argv.slice(2);

if (!packageName) {
  console.error('Usage: node scripts/create-package.js <package-name> [package-type]');
  console.error('Example: node scripts/create-package.js my-package library');
  process.exit(1);
}

// Validate package name
if (!/^[a-z0-9-]+$/.test(packageName)) {
  console.error('Package name must be lowercase with hyphens');
  process.exit(1);
}

// Validate package type
const validTypes = ['library', 'react', 'node', 'browser'];
if (!validTypes.includes(packageType)) {
  console.error(`Invalid package type. Must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Paths
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');
const packageDir = path.join(packagesDir, packageName);
const srcDir = path.join(packageDir, 'src');
const testDir = path.join(packageDir, '__tests__');

// Create directories
const dirs = [packageDir, srcDir, testDir];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${path.relative(rootDir, dir)}`);
  }
}

// Create package.json
const packageJson = {
  name: `@salahor/${packageName}`,
  version: '0.1.0',
  description: `Salahor ${packageType} package: ${packageName}`,
  main: 'dist/index.js',
  module: 'dist/index.mjs',
  types: 'dist/index.d.ts',
  files: ['dist'],
  scripts: {
    build: 'tsc',
    test: 'vitest run',
    'test:watch': 'vitest watch',
    'test:coverage': 'vitest run --coverage',
    prepublishOnly: 'pnpm run build',
    lint: 'eslint src --ext .ts,.tsx',
    format: 'prettier --write "src/**/*.{ts,tsx}"',
  },
  keywords: ['salahor', packageType, ...packageName.split('-')],
  author: '',
  license: 'MIT',
  publishConfig: {
    access: 'public',
  },
  dependencies: {},
  devDependencies: {},
  peerDependencies: {},
};

// Add type-specific dependencies and config
switch (packageType) {
  case 'react':
    packageJson.peerDependencies = {
      ...packageJson.peerDependencies,
      react: '^18.0.0',
      'react-dom': '^18.0.0',
    };
    break;
  
  case 'node':
    packageJson.engines = {
      node: '>=16.0.0',
    };
    break;
    
  case 'browser':
    packageJson.browser = {
      './dist/index.js': './dist/index.browser.js',
      './dist/index.mjs': './dist/index.browser.mjs',
    };
    break;
}

// Write package.json
fs.writeFileSync(
  path.join(packageDir, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);
console.log('Created package.json');

// Create tsconfig.json
const tsconfig = {
  extends: "../../tsconfig.base.json",
  compilerOptions: {
    rootDir: "src",
    outDir: "dist",
    baseUrl: ".",
    paths: {
      "@salahor/*": ["../../packages/*/src"],
    },
    ...(packageType === 'react' && { jsx: 'react-jsx' }),
  },
  include: ["src"],
  exclude: ["node_modules", "dist", "**/__tests__"]
};

fs.writeFileSync(
  path.join(packageDir, 'tsconfig.json'),
  JSON.stringify(tsconfig, null, 2) + '\n'
);
console.log('Created tsconfig.json');

// Create README.md
const readmeContent = `# @salahor/${packageName}

> ${packageJson.description}

## Installation

\`\`\`bash
pnpm add @salahor/${packageName}
\`\`\`

## Usage

\`\`\`ts
import { something } from '@salahor/${packageName}';
\`\`\`

## API

### something()

Does something useful.

## License

MIT
`;

fs.writeFileSync(path.join(packageDir, 'README.md'), readmeContent);
console.log('Created README.md');

// Create index.ts
const indexPath = path.join(srcDir, 'index.ts');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, '// Export your package here\n');
  console.log('Created src/index.ts');
}

// Create test file
const testPath = path.join(testDir, 'index.test.ts');
if (!fs.existsSync(testPath)) {
  const testContent = `import { describe, it, expect } from 'vitest';

describe('${packageName}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
`;
  fs.writeFileSync(testPath, testContent);
  console.log('Created __tests__/index.test.ts');
}

console.log('\n✅ Package created successfully!');
console.log('\nNext steps:');
console.log(`1. cd ${path.relative(process.cwd(), packageDir)}`);
console.log('2. Start developing!');

// Install dependencies if in a terminal
if (process.stdout.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('\nInstall dependencies? (y/N) ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('Installing dependencies...');
      try {
        execSync('pnpm install', { stdio: 'inherit', cwd: packageDir });
        console.log('\n✅ Dependencies installed!');
      } catch (error) {
        console.error('Failed to install dependencies:', error.message);
      }
    }
    rl.close();
  });
}
