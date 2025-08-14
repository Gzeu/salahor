import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration for all packages
const baseConfig = {
  scripts: {
    "prebuild": "pnpm run clean",
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -p tsconfig.build.json --watch",
    "clean": "rimraf dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "prepublishOnly": "pnpm run build",
    "preversion": "pnpm test"
  },
  devDependencies: {
    "@types/node": "^20.5.7",
    "@typescript-eslint/eslint-plugin": "^6.4.0",
    "@typescript-eslint/parser": "^6.4.0",
    "eslint": "^8.47.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "prettier": "^3.0.2",
    "rimraf": "^5.0.1",
    "typescript": "^5.1.6",
    "vitest": "^0.34.3"
  },
  publishConfig: {
    "access": "public"
  }
};

// Package-specific configurations
const packageConfigs = {
  core: {
    description: "Core utilities and types for Salahor ecosystem",
    keywords: ["events", "async-iterable", "reactive", "streams", "salahor", "core"],
    dependencies: {
      "tslib": "^2.6.0"
    }
  },
  websocket: {
    description: "WebSocket connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: ["websocket", "realtime", "events", "async-iterable", "salahor", "connector"],
    peerDependencies: {
      "ws": "^8.0.0"
    },
    devDependencies: {
      "@types/ws": "^8.5.10"
    }
  },
  sse: {
    description: "Server-Sent Events (SSE) connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: ["sse", "server-sent-events", "events", "async-iterable", "salahor", "connector"]
  },
  mqtt: {
    description: "MQTT connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: ["mqtt", "iot", "messaging", "events", "async-iterable", "salahor", "connector"],
    peerDependencies: {
      "mqtt": "^5.0.0"
    },
    devDependencies: {
      "@types/mqtt": "^2.5.0"
    }
  },
  'graphql-subscriptions': {
    description: "GraphQL Subscriptions connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: ["graphql", "subscriptions", "events", "async-iterable", "salahor", "connector"],
    peerDependencies: {
      "graphql-subscriptions": "^2.0.0"
    }
  }
};

async function updatePackageJson(packagePath, packageName) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  try {
    const data = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(data);
    
    // Skip if it's a private package
    if (packageJson.private) return;
    
    // Get package-specific config or use empty object if not found
    const packageConfig = packageConfigs[packageName] || {};
    
    // Update scripts
    packageJson.scripts = {
      ...baseConfig.scripts,
      ...(packageJson.scripts || {})
    };
    
    // Update devDependencies
    packageJson.devDependencies = {
      ...baseConfig.devDependencies,
      ...(packageConfig.devDependencies || {})
    };
    
    // Update peerDependencies if they exist in package config
    if (packageConfig.peerDependencies) {
      packageJson.peerDependencies = {
        ...(packageJson.peerDependencies || {}),
        ...packageConfig.peerDependencies
      };
    }
    
    // Update other fields if they don't exist
    if (!packageJson.keywords && packageConfig.keywords) {
      packageJson.keywords = packageConfig.keywords;
    }
    
    if (!packageJson.description && packageConfig.description) {
      packageJson.description = packageConfig.description;
    }
    
    // Ensure repository information
    if (!packageJson.repository) {
      packageJson.repository = {
        type: "git",
        url: "git+https://github.com/Gzeu/salahor.git",
        directory: `packages/${packagePath.includes('protocol-connectors') ? 'protocol-connectors/' : ''}${packageName}`
      };
    }
    
    // Ensure bugs and homepage
    if (!packageJson.bugs) {
      packageJson.bugs = {
        url: "https://github.com/Gzeu/salahor/issues"
      };
    }
    
    if (!packageJson.homepage) {
      packageJson.homepage = `https://github.com/Gzeu/salahor/tree/main/packages/${packagePath.includes('protocol-connectors') ? 'protocol-connectors/' : ''}${packageName}#readme`;
    }
    
    // Write the updated package.json
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf8'
    );
    
    console.log(`✅ Updated ${packageName} package.json`);
  } catch (error) {
    console.error(`❌ Error updating ${packageName}:`, error.message);
  }
}

async function createConfigFiles(packagePath, packageName) {
  const configFiles = [
    {
      name: '.eslintrc.js',
      content: `module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prettier/prettier': 'error',
  },
  ignorePatterns: ['dist/**', '**/*.d.ts', '**/*.js'],
};`
    },
    {
      name: '.prettierrc.js',
      content: `// @ts-check
const baseConfig = require('../../../.prettierrc.js');

module.exports = {
  ...baseConfig,
  // Add package-specific overrides here if needed
};`
    },
    {
      name: 'tsconfig.json',
      content: JSON.stringify({
        "extends": "../../../tsconfig.base.json",
        "compilerOptions": {
          "outDir": "./dist",
          "rootDir": "./src",
          "composite": true
        },
        "include": ["src"],
        "exclude": ["node_modules", "dist"]
      }, null, 2) + '\n'
    },
    {
      name: 'tsconfig.build.json',
      content: JSON.stringify({
        "extends": "./tsconfig.json",
        "compilerOptions": {
          "noEmit": false,
          "declaration": true,
          "declarationMap": true,
          "sourceMap": true,
          "outDir": "./dist"
        },
        "exclude": ["**/*.test.ts", "**/*.spec.ts"]
      }, null, 2) + '\n'
    },
    {
      name: 'vitest.config.ts',
      content: `import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'node' if testing Node.js code
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/__mocks__/**',
        '**/types/**',
      ],
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@salahor/${packageName}': resolve(__dirname, 'src'),
    },
  },
});`
    }
  ];

  for (const file of configFiles) {
    const filePath = path.join(packagePath, file.name);
    
    try {
      await fs.access(filePath);
      console.log(`ℹ️  ${file.name} already exists in ${packageName}`);
    } catch {
      await fs.writeFile(filePath, file.content, 'utf8');
      console.log(`✅ Created ${file.name} for ${packageName}`);
    }
  }
}

async function processPackage(packagePath, packageName) {
  console.log(`\nProcessing ${packageName}...`);
  
  // Ensure package has a package.json
  try {
    await fs.access(path.join(packagePath, 'package.json'));
  } catch {
    console.log(`⚠️  No package.json found in ${packagePath}, skipping...`);
    return;
  }
  
  // Update package.json
  await updatePackageJson(packagePath, packageName);
  
  // Create config files
  await createConfigFiles(packagePath, packageName);
  
  // Create src directory if it doesn't exist
  const srcDir = path.join(packagePath, 'src');
  try {
    await fs.mkdir(srcDir, { recursive: true });
    console.log(`✅ Ensured src directory exists for ${packageName}`);
  } catch (error) {
    console.error(`❌ Error creating src directory for ${packageName}:`, error.message);
  }
  
  // Create a basic index.ts if it doesn't exist
  const indexPath = path.join(srcDir, 'index.ts');
  try {
    await fs.access(indexPath);
  } catch {
    await fs.writeFile(
      indexPath,
      `/**
 * ${packageName} - ${packageConfigs[packageName]?.description || 'Part of the Salahor ecosystem'}
 * @packageDocumentation
 */

export * from './types';
`,
      'utf8'
    );
    console.log(`✅ Created basic index.ts for ${packageName}`);
  }
  
  // Create a basic types.ts if it doesn't exist
  const typesPath = path.join(srcDir, 'types.ts');
  try {
    await fs.access(typesPath);
  } catch {
    await fs.writeFile(
      typesPath,
      `/**
 * Type definitions for @salahor/${packageName}
 * @packageDocumentation
 */

// Export your types here
export interface ${packageName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Options {
  // Add your options here
}
`,
      'utf8'
    );
    console.log(`✅ Created basic types.ts for ${packageName}`);
  }
}

async function main() {
  // Process core package
  await processPackage(path.join(__dirname, '../packages/core'), 'core');
  
  // Process protocol connectors
  const protocolConnectorsPath = path.join(__dirname, '../packages/protocol-connectors');
  try {
    const items = await fs.readdir(protocolConnectorsPath, { withFileTypes: true });
    const packages = items
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(dir => ({
        name: dir.name,
        path: path.join(protocolConnectorsPath, dir.name)
      }));
    
    for (const pkg of packages) {
      await processPackage(pkg.path, pkg.name);
    }
  } catch (error) {
    console.error('Error reading protocol connectors directory:', error);
  }
  
  console.log('\n🎉 All packages have been processed!');
}

main().catch(console.error);
