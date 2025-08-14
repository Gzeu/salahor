#!/usr/bin/env node

/**
 * Build script for the Salahor monorepo
 * Builds all packages in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the root directory
const rootDir = path.resolve(__dirname, '..');

// Build order for packages with dependencies
const buildOrder = [
  'core',
  'protocol-connectors/*',
  'utils/*',
  'backend/*',
  'frontend/*',
  '*'  // Any other packages
];

console.log('🚀 Starting build process...\n');

// Run build for each package in order
for (const pkgPattern of buildOrder) {
  const packages = pkgPattern.includes('*')
    ? getPackagesMatchingPattern(pkgPattern)
    : [pkgPattern];

  for (const pkg of packages) {
    const pkgPath = path.join(rootDir, 'packages', pkg);
    
    // Check if package has a build script
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = require(pkgJsonPath);
      
      if (pkgJson.scripts && pkgJson.scripts.build) {
        console.log(`📦 Building ${pkg}...`);
        
        try {
          execSync('pnpm run build', {
            cwd: pkgPath,
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' }
          });
          console.log(`✅ Successfully built ${pkg}\n`);
        } catch (error) {
          console.error(`❌ Failed to build ${pkg}`);
          process.exit(1);
        }
      }
    }
  }
}
console.log('🎉 All packages built successfully!');

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
