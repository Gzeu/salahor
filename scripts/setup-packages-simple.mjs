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
    "format": "prettier --write \"src/**/*.{ts,tsx,json}\"",
    "typecheck": "tsc --noEmit",
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
  },
  repository: {
    type: "git",
    url: "git+https://github.com/Gzeu/salahor.git"
  },
  bugs: {
    url: "https://github.com/Gzeu/salahor/issues"
  },
  homepage: "https://github.com/Gzeu/salahor#readme",
  engines: {
    "node": ">=18.0.0"
  },
  files: [
    "dist"
  ]
};

// Package configurations
const packages = {
  // Frontend packages
  'frontend-react': {
    description: "React integration for Salahor - React hooks and components for real-time data streams",
    keywords: ["react", "hooks", "components", "realtime", "salahor", "frontend"],
    peerDependencies: {
      "react": ">=16.8.0",
      "react-dom": ">=16.8.0"
    },
    devDependencies: {
      "@types/react": "^18.2.15",
      "@types/react-dom": "^18.2.7",
      "@vitejs/plugin-react": "^4.0.4",
      "vite": "^4.4.5"
    },
    scripts: {
      "dev": "vite",
      "preview": "vite preview",
      "build:demo": "vite build"
    }
  },
  'frontend-vue': {
    description: "Vue 3 integration for Salahor - Vue composables and components for real-time data streams",
    keywords: ["vue", "vue3", "composition-api", "realtime", "salahor", "frontend"],
    peerDependencies: {
      "vue": "^3.3.0"
    },
    devDependencies: {
      "@vitejs/plugin-vue": "^4.3.1",
      "@vue/compiler-sfc": "^3.3.4",
      "vite": "^4.4.5"
    },
    scripts: {
      "dev": "vite",
      "preview": "vite preview",
      "build:demo": "vite build"
    }
  },
  // Backend packages
  'backend-express': {
    description: "Express.js middleware for Salahor - Easy integration of real-time capabilities into Express applications",
    keywords: ["express", "middleware", "server", "realtime", "salahor", "backend"],
    peerDependencies: {
      "express": "^4.18.2",
      "cors": "^2.8.5"
    },
    devDependencies: {
      "@types/express": "^4.17.17",
      "@types/cors": "^2.8.13",
      "ts-node": "^10.9.1",
      "nodemon": "^3.0.1"
    },
    scripts: {
      "dev": "nodemon --exec ts-node src/demo/server.ts",
      "start": "node dist/demo/server.js"
    }
  },
  'backend-fastify': {
    description: "Fastify plugin for Salahor - High-performance real-time capabilities for Fastify applications",
    keywords: ["fastify", "plugin", "server", "realtime", "salahor", "backend"],
    peerDependencies: {
      "fastify": "^4.0.0",
      "@fastify/cors": "^8.3.0"
    },
    devDependencies: {
      "@fastify/type-provider-typescript": "^3.1.0",
      "ts-node": "^10.9.1",
      "nodemon": "^3.0.1"
    },
    scripts: {
      "dev": "nodemon --exec ts-node src/demo/server.ts",
      "start": "node dist/demo/server.js"
    }
  }
};

async function createPackage(packageName, packageConfig) {
  const packagePath = path.join(__dirname, '..', 'packages', packageName);
  
  try {
    // Create package directory
    await fs.mkdir(packagePath, { recursive: true });
    
    // Create src directory
    const srcPath = path.join(packagePath, 'src');
    await fs.mkdir(srcPath, { recursive: true });
    
    // Create test directory
    const testPath = path.join(packagePath, 'test');
    await fs.mkdir(testPath, { recursive: true });
    
    // Create demo directory if needed
    if (packageConfig.scripts?.dev || packageConfig.scripts?.['build:demo']) {
      const demoPath = path.join(packagePath, 'demo');
      await fs.mkdir(demoPath, { recursive: true });
    }
    
    // Create package.json
    const packageJson = {
      name: `@salahor/${packageName}`,
      version: "0.1.0",
      description: packageConfig.description,
      keywords: packageConfig.keywords,
      type: "module",
      main: "dist/index.js",
      module: "dist/index.js",
      types: "dist/index.d.ts",
      files: ["dist"],
      scripts: {
        ...baseConfig.scripts,
        ...(packageConfig.scripts || {})
      },
      dependencies: {
        "@salahor/core": "workspace:*",
        ...(packageConfig.dependencies || {})
      },
      peerDependencies: {
        ...(packageConfig.peerDependencies || {})
      },
      devDependencies: {
        ...baseConfig.devDependencies,
        ...(packageConfig.devDependencies || {})
      },
      publishConfig: baseConfig.publishConfig,
      repository: {
        ...baseConfig.repository,
        directory: `packages/${packageName}`
      },
      bugs: baseConfig.bugs,
      homepage: `https://github.com/Gzeu/salahor/tree/main/packages/${packageName}#readme`,
      engines: baseConfig.engines,
      sideEffects: false
    };
    
    // Write package.json
    await fs.writeFile(
      path.join(packagePath, 'package.json'),
      JSON.stringify(packageJson, null, 2) + '\n',
      'utf8'
    );
    
    // Create tsconfig.json
    const tsconfig = {
      "extends": "../../../tsconfig.base.json",
      "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src",
        "composite": true,
        "jsx": packageName.includes('react') ? "react-jsx" : undefined,
        "jsxImportSource": packageName.includes('react') ? "react" : undefined
      },
      "include": ["src"],
      "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
    };
    
    await fs.writeFile(
      path.join(packagePath, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2) + '\n',
      'utf8'
    );
    
    // Create tsconfig.build.json
    const tsconfigBuild = {
      "extends": "./tsconfig.json",
      "compilerOptions": {
        "noEmit": false,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist"
      },
      "exclude": ["**/*.test.ts", "**/*.spec.ts", "demo"]
    };
    
    await fs.writeFile(
      path.join(packagePath, 'tsconfig.build.json'),
      JSON.stringify(tsconfigBuild, null, 2) + '\n',
      'utf8'
    );
    
    // Create basic index.ts
    const indexContent = `/**
 * @salahor/${packageName} - ${packageConfig.description}
 * @packageDocumentation
 */

export * from './types';
`;
    
    await fs.writeFile(
      path.join(packagePath, 'src', 'index.ts'),
      indexContent,
      'utf8'
    );
    
    // Create basic types.ts
    const typeName = packageName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
      
    const typesContent = `/**
 * Type definitions for @salahor/${packageName}
 * @packageDocumentation
 */

// Export your types here
export interface ${typeName}Options {
  // Add your options here
}
`;
    
    await fs.writeFile(
      path.join(packagePath, 'src', 'types.ts'),
      typesContent,
      'utf8'
    );
    
    // Create README.md
    const readmeContent = `# @salahor/${packageName}

${packageConfig.description}

## Installation

\`\`\`bash
pnpm add @salahor/${packageName}
\`\`\`

## Usage

Add usage examples here

## API Reference

Document your API here

## License

MIT
`;
    
    await fs.writeFile(
      path.join(packagePath, 'README.md'),
      readmeContent,
      'utf8'
    );
    
    console.log(`✅ Created package: @salahor/${packageName}`);
    
  } catch (error) {
    console.error(`❌ Error creating package @salahor/${packageName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Setting up frontend and backend packages...');
  
  // Create all packages
  for (const [pkgName, pkgConfig] of Object.entries(packages)) {
    await createPackage(pkgName, pkgConfig);
  }
  
  console.log('\n🎉 All packages have been set up successfully!');
  console.log('\nNext steps:');
  console.log('1. Run `pnpm install` to install all dependencies');
  console.log('2. Run `pnpm run build` to build all packages');
  console.log('3. Run `pnpm test` to run tests');
  console.log('4. Start implementing the actual functionality in each package');
}

main().catch(console.error);
