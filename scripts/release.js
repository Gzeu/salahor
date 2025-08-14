#!/usr/bin/env node

/**
 * Release script for the Salahor monorepo
 * Handles versioning and publishing of packages
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const semver = require('semver');
const inquirer = require('inquirer');
const chalk = require('chalk');

const argv = yargs(hideBin(process.argv))
  .option('preid', {
    type: 'string',
    description: 'Prerelease identifier (e.g., alpha, beta, rc)',
  })
  .option('dry-run', {
    type: 'boolean',
    description: 'Run without making changes',
    default: false,
  })
  .argv;

// Get the root directory
const rootDir = path.resolve(__dirname, '..');

// Check if working directory is clean
function checkCleanWorkingDir() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim() !== '') {
      console.error('❌ Working directory is not clean. Please commit or stash changes before releasing.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to check git status:', error.message);
    process.exit(1);
  }
}

// Get next version based on conventional commits
async function getNextVersion() {
  try {
    // Get all commits since last tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s"`, { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);

    // Determine version bump type
    let bumpType = 'patch';
    for (const commit of commits) {
      if (commit.match(/^BREAKING CHANGE:/) || commit.match(/^feat\(.*\)!:.*/)) {
        bumpType = 'major';
        break;
      } else if (commit.match(/^feat\(.*\):.*/)) {
        bumpType = 'minor';
      }
    }

    // Get current version
    const pkgJson = require(path.join(rootDir, 'package.json'));
    const currentVersion = pkgJson.version;
    
    // Calculate next version
    let nextVersion = semver.inc(currentVersion, bumpType, argv.preid);
    
    // Confirm with user
    const { version } = await inquirer.prompt([{
      type: 'input',
      name: 'version',
      message: `Current version: ${currentVersion}. Enter new version (${bumpType}):`,
      default: nextVersion,
      validate: (input) => {
        if (!semver.valid(input)) return 'Please enter a valid version';
        if (semver.lte(input, currentVersion)) {
          return `Version must be greater than ${currentVersion}`;
        }
        return true;
      }
    }]);

    return version;
  } catch (error) {
    console.error('❌ Failed to determine next version:', error.message);
    process.exit(1);
  }
}

// Update version in package.json files
function updateVersions(version) {
  console.log(`\n🔄 Updating versions to ${version}...`);
  
  // Update root package.json
  const rootPkgPath = path.join(rootDir, 'package.json');
  const rootPkg = require(rootPkgPath);
  rootPkg.version = version;
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  
  // Update all packages
  const packages = getPackages();
  for (const pkg of packages) {
    const pkgPath = path.join(rootDir, 'packages', pkg, 'package.json');
    const pkgJson = require(pkgPath);
    pkgJson.version = version;
    
    // Update dependencies
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (pkgJson[depType]) {
        for (const dep of packages) {
          if (pkgJson[depType][`@salahor/${dep}`]) {
            pkgJson[depType][`@salahor/${dep}`] = `^${version}`;
          }
        }
      }
    }
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
  }
  
  console.log('✅ Updated versions');
}

// Create a release commit and tag
function createReleaseCommit(version) {
  console.log('\n📦 Creating release commit...');
  
  // Add all package.json files
  execSync('git add package.json packages/*/package.json');
  
  // Create commit
  execSync(`git commit -m "chore(release): v${version}"`);
  
  // Create tag
  execSync(`git tag -a v${version} -m "v${version}"`);
  
  console.log('✅ Created release commit and tag');
}

// Publish packages
function publishPackages() {
  console.log('\n🚀 Publishing packages...');
  
  // Build all packages first
  execSync('pnpm run build', { stdio: 'inherit' });
  
  // Publish each package
  const packages = getPackages();
  for (const pkg of packages) {
    console.log(`\n📦 Publishing @salahor/${pkg}...`);
    const pkgPath = path.join(rootDir, 'packages', pkg);
    
    try {
      execSync('pnpm publish --access public', {
        cwd: pkgPath,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: '1' }
      });
      console.log(`✅ Published @salahor/${pkg}`);
    } catch (error) {
      console.error(`❌ Failed to publish @salahor/${pkg}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n🎉 All packages published successfully!');
}

// Push changes to remote
function pushChanges() {
  console.log('\n📤 Pushing changes to remote...');
  execSync('git push --follow-tags', { stdio: 'inherit' });
  console.log('✅ Pushed changes to remote');
}

// Get all packages
function getPackages() {
  const glob = require('glob');
  return glob.sync('*', {
    cwd: path.join(rootDir, 'packages'),
    ignore: ['node_modules/**'],
    onlyDirectories: true
  });
}

// Main function
async function main() {
  console.log(chalk.bold('🚀 Starting release process...\n'));
  
  // Check for clean working directory
  checkCleanWorkingDir();
  
  // Get next version
  const version = await getNextVersion();
  
  // Update versions
  updateVersions(version);
  
  // Create release commit and tag
  createReleaseCommit(version);
  
  // Publish packages if not a dry run
  if (argv.dryRun) {
    console.log('\n⚠️  Dry run complete. No changes were made.');
    console.log('To publish, run without --dry-run');
  } else {
    // Publish packages
    publishPackages();
    
    // Push changes
    pushChanges();
    
    console.log(`\n🎉 Successfully released v${version}!`);
  }
}

// Run the release
main().catch(error => {
  console.error('\n❌ Release failed:', error);
  process.exit(1);
});
