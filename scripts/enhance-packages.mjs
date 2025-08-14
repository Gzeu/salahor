import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced configuration for all packages
const enhancedConfig = {
  // Common scripts that should be in all packages
  scripts: {
    "prebuild": "pnpm run clean",
    "build": "tsc -p tsconfig.build.json",
    "build:watch": "tsc -p tsconfig.build.json --watch",
    "clean": "rimraf dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --run --coverage.reporters=text",
    "test:update": "vitest -u",
    "lint": "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json}\"",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm run build",
    "preversion": "pnpm test",
    "version": "pnpm run format && git add -A src"
  },
  
  // Common devDependencies
  devDependencies: {
    // Core
    "@types/node": "^20.5.7",
    "typescript": "^5.1.6",
    "rimraf": "^5.0.1",
    
    // Testing
    "vitest": "^0.34.3",
    "@vitest/coverage-v8": "^0.34.3",
    "@vitest/ui": "^0.34.3",
    "@vitest/coverage-istanbul": "^0.34.3",
    "@types/jest": "^29.5.2",
    "happy-dom": "^9.20.3",
    "jsdom": "^22.1.0",
    
    // Linting & Formatting
    "eslint": "^8.47.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-import": "^2.28.1",
    "eslint-plugin-prettier": "^5.0.0",
    "eslint-plugin-vitest": "^0.3.8",
    "@typescript-eslint/eslint-plugin": "^6.4.0",
    "@typescript-eslint/parser": "^6.4.0",
    "prettier": "^3.0.2",
    "eslint-plugin-jsdoc": "^46.5.1",
    "eslint-plugin-tsdoc": "^0.2.17",
    
    // Documentation
    "typedoc": "^0.25.2",
    "typedoc-plugin-markdown": "^3.15.4",
    "typedoc-plugin-no-inherit": "^1.4.0",
    "typedoc-plugin-missing-exports": "^2.0.0",
    "@microsoft/api-extractor": "^7.37.1"
  },
  
  // Common metadata
  publishConfig: {
    "access": "public",
    "provenance": true
  },
  
  // Common repository info
  repository: {
    type: "git",
    url: "git+https://github.com/Gzeu/salahor.git"
  },
  bugs: {
    url: "https://github.com/Gzeu/salahor/issues"
  },
  homepage: "https://github.com/Gzeu/salahor#readme",
  
  // Common funding info
  funding: {
    type: "individual",
    url: "https://github.com/sponsors/Gzeu"
  },
  
  // Common engines
  engines: {
    "node": ">=18.0.0"
  },
  
  // Common files to include
  files: [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ]
};

// Package-specific configurations
const packageConfigs = {
  core: {
    description: "Core utilities and types for Salahor ecosystem - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: [
      "events", 
      "async-iterable", 
      "reactive", 
      "streams", 
      "observable",
      "salahor", 
      "core",
      "typescript",
      "esm"
    ],
    dependencies: {
      "tslib": "^2.6.0"
    },
    sideEffects: false,
    type: "module",
    main: "dist/index.js",
    module: "dist/index.js",
    types: "dist/index.d.ts",
    exports: {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "default": "./dist/index.js"
      }
    }
  },
  websocket: {
    description: "WebSocket connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: [
      "websocket", 
      "realtime", 
      "events", 
      "async-iterable", 
      "salahor", 
      "connector",
      "typescript",
      "esm"
    ],
    peerDependencies: {
      "ws": "^8.0.0"
    },
    devDependencies: {
      "@types/ws": "^8.5.10"
    },
    sideEffects: false,
    type: "module",
    main: "dist/index.js",
    module: "dist/index.js",
    types: "dist/index.d.ts",
    exports: {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "default": "./dist/index.js"
      },
      "./client": {
        "types": "./dist/client/index.d.ts",
        "import": "./dist/client/index.js",
        "default": "./dist/client/index.js"
      },
      "./server": {
        "types": "./dist/server/index.d.ts",
        "import": "./dist/server/index.js",
        "default": "./dist/server/index.js"
      }
    }
  },
  sse: {
    description: "Server-Sent Events (SSE) connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: [
      "sse", 
      "server-sent-events", 
      "events", 
      "async-iterable", 
      "salahor", 
      "connector",
      "typescript",
      "esm"
    ],
    peerDependencies: {
      "eventsource-parser": "^2.0.0"
    },
    sideEffects: false,
    type: "module",
    main: "dist/index.js",
    module: "dist/index.js",
    types: "dist/index.d.ts",
    exports: {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "default": "./dist/index.js"
      }
    }
  },
  mqtt: {
    description: "MQTT connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: [
      "mqtt", 
      "iot", 
      "messaging", 
      "events", 
      "async-iterable", 
      "salahor", 
      "connector",
      "typescript",
      "esm"
    ],
    peerDependencies: {
      "mqtt": "^5.0.0"
    },
    devDependencies: {
      "@types/mqtt": "^2.5.0"
    },
    sideEffects: false,
    type: "module",
    main: "dist/index.js",
    module: "dist/index.js",
    types: "dist/index.d.ts",
    exports: {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "default": "./dist/index.js"
      }
    }
  },
  'graphql-subscriptions': {
    description: "GraphQL Subscriptions connector for Salahor - Zero-dependency universal connectors between Events, EventTargets and AsyncIterables",
    keywords: [
      "graphql", 
      "subscriptions", 
      "events", 
      "async-iterable", 
      "salahor", 
      "connector",
      "typescript",
      "esm"
    ],
    peerDependencies: {
      "graphql-subscriptions": "^2.0.0",
      "graphql": "^16.0.0"
    },
    sideEffects: false,
    type: "module",
    main: "dist/index.js",
    module: "dist/index.js",
    types: "dist/index.d.ts",
    exports: {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "default": "./dist/index.js"
      }
    }
  }
};

async function enhancePackageJson(packagePath, packageName) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  try {
    const data = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(data);
    
    // Skip if it's a private package
    if (packageJson.private) return;
    
    // Get package-specific config or use empty object if not found
    const packageConfig = packageConfigs[packageName] || {};
    
    // Merge scripts
    packageJson.scripts = {
      ...enhancedConfig.scripts,
      ...(packageJson.scripts || {})
    };
    
    // Merge devDependencies
    packageJson.devDependencies = {
      ...enhancedConfig.devDependencies,
      ...(packageConfig.devDependencies || {})
    };
    
    // Merge peerDependencies
    if (packageConfig.peerDependencies) {
      packageJson.peerDependencies = {
        ...(packageJson.peerDependencies || {}),
        ...packageConfig.peerDependencies
      };
    }
    
    // Update other fields if they don't exist or should be overridden
    if (!packageJson.keywords || packageName in packageConfigs) {
      packageJson.keywords = packageConfig.keywords || enhancedConfig.keywords || [];
    }
    
    if (!packageJson.description || packageName in packageConfigs) {
      packageJson.description = packageConfig.description || enhancedConfig.description || '';
    }
    
    // Update repository information
    packageJson.repository = {
      ...(enhancedConfig.repository || {}),
      ...(packageConfig.repository || {})
    };
    
    // Update bugs and homepage
    packageJson.bugs = {
      ...(enhancedConfig.bugs || {}),
      ...(packageConfig.bugs || {})
    };
    
    packageJson.homepage = packageConfig.homepage || 
      `https://github.com/Gzeu/salahor/tree/main/packages/${packagePath.includes('protocol-connectors') ? 'protocol-connectors/' : ''}${packageName}#readme`;
    
    // Update other important fields
    packageJson.engines = {
      ...(enhancedConfig.engines || {})
    };
    
    packageJson.publishConfig = {
      ...(enhancedConfig.publishConfig || {})
    };
    
    packageJson.funding = {
      ...(enhancedConfig.funding || {})
    };
    
    // Update type, main, module, types, and exports
    if (packageConfig.type) packageJson.type = packageConfig.type;
    if (packageConfig.main) packageJson.main = packageConfig.main;
    if (packageConfig.module) packageJson.module = packageConfig.module;
    if (packageConfig.types) packageJson.types = packageConfig.types;
    if (packageConfig.sideEffects !== undefined) packageJson.sideEffects = packageConfig.sideEffects;
    
    // Update exports if specified in package config
    if (packageConfig.exports) {
      packageJson.exports = packageConfig.exports;
    }
    
    // Ensure files array includes necessary files
    if (!packageJson.files) {
      packageJson.files = [...(enhancedConfig.files || [])];
    }
    
    // Add common fields if they don't exist
    if (!packageJson.author) {
      packageJson.author = "Your Name <your.email@example.com> (https://github.com/yourusername)";
    }
    
    if (!packageJson.license) {
      packageJson.license = "MIT";
    }
    
    // Add version lifecycle scripts
    if (!packageJson.scripts) packageJson.scripts = {};
    if (!packageJson.scripts.version) {
      packageJson.scripts.version = "pnpm run build";
    }
    
    // Sort package.json keys for consistency
    const sortedPackageJson = {};
    const keyOrder = [
      'name', 'version', 'description', 'keywords', 'author', 'license', 'repository', 
      'homepage', 'bugs', 'funding', 'type', 'main', 'module', 'types', 'exports',
      'bin', 'browser', 'files', 'sideEffects', 'engines', 'os', 'cpu', 'publishConfig',
      'dependencies', 'peerDependencies', 'peerDependenciesMeta', 'optionalDependencies',
      'devDependencies', 'scripts', 'husky', 'lint-staged', 'config', 'eslintConfig',
      'prettier', 'babel', 'jest', 'browserslist', 'release', 'private'
    ];
    
    // Add all keys in order if they exist
    keyOrder.forEach(key => {
      if (packageJson[key] !== undefined) {
        sortedPackageJson[key] = packageJson[key];
      }
    });
    
    // Add any remaining keys that weren't in our order list
    Object.keys(packageJson)
      .filter(key => !keyOrder.includes(key))
      .sort()
      .forEach(key => {
        sortedPackageJson[key] = packageJson[key];
      });
    
    // Write the updated package.json
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(sortedPackageJson, null, 2) + '\n',
      'utf8'
    );
    
    console.log(`✅ Enhanced ${packageName} package.json`);
  } catch (error) {
    console.error(`❌ Error enhancing ${packageName}:`, error.message);
  }
}

async function processPackage(packagePath, packageName) {
  console.log(`\nProcessing ${packageName}...`);
  
  // Ensure package has a package.json
  const packageJsonPath = path.join(packagePath, 'package.json');
  try {
    await fs.access(packageJsonPath);
  } catch {
    console.log(`⚠️  No package.json found in ${packagePath}, skipping...`);
    return;
  }
  
  // Enhance package.json
  await enhancePackageJson(packagePath, packageName);
  
  console.log(`✅ Completed processing ${packageName}`);
}

async function main() {
  console.log('🚀 Enhancing all packages in the monorepo...');
  
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
  
  console.log('\n🎉 All packages have been enhanced!');
  console.log('\nNext steps:');
  console.log('1. Review the changes to ensure everything looks correct');
  console.log('2. Run `pnpm install` to update dependencies');
  console.log('3. Run `pnpm run build` to verify everything builds');
  console.log('4. Run `pnpm test` to run tests');
}

main().catch(console.error);
