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
  publishConfig: {
    "access": "public",
    "provenance": true
  },
  repository: {
    type: "git",
    url: "git+https://github.com/Gzeu/salahor.git"
  },
  bugs: {
    url: "https://github.com/Gzeu/salahor/issues"
  },
  funding: {
    type: "individual",
    url: "https://github.com/sponsors/Gzeu"
  },
  engines: {
    "node": ">=18.0.0"
  },
  files: [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ]
};

// Frontend framework specific configurations
const frontendConfigs = {
  react: {
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
  vue: {
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
  svelte: {
    description: "Svelte integration for Salahor - Svelte stores and components for real-time data streams",
    keywords: ["svelte", "stores", "components", "realtime", "salahor", "frontend"],
    peerDependencies: {
      "svelte": "^4.0.0"
    },
    devDependencies: {
      "@sveltejs/vite-plugin-svelte": "^2.4.2",
      "svelte": "^4.0.0",
      "svelte-check": "^3.4.3",
      "vite": "^4.4.5"
    },
    scripts: {
      "dev": "vite",
      "preview": "vite preview",
      "build:demo": "vite build",
      "check": "svelte-check --tsconfig ./tsconfig.json"
    }
  }
};

// Backend framework specific configurations
const backendConfigs = {
  express: {
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
  fastify: {
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

async function createPackage(packagePath, packageConfig) {
  try {
    // Create package directory if it doesn't exist
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
      name: `@salahor/${packageConfig.name}`,
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
        directory: `packages/${packageConfig.type}/${packageConfig.name}`
      },
      bugs: baseConfig.bugs,
      homepage: `https://github.com/Gzeu/salahor/tree/main/packages/${packageConfig.type}/${packageConfig.name}#readme`,
      funding: baseConfig.funding,
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
        "jsx": packageConfig.name === 'react' ? "react-jsx" : undefined,
        "jsxImportSource": packageConfig.name === 'react' ? "react" : undefined
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
    
    // Create .eslintrc.js
    const eslintConfig = `module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    ${packageConfig.name === 'react' ? "'plugin:react/recommended'," : ''}
    ${packageConfig.name === 'react' ? "'plugin:react-hooks/recommended'," : ''}
    ${packageConfig.name === 'vue' ? "'plugin:vue/vue3-recommended'," : ''}
    ${packageConfig.name === 'svelte' ? "'plugin:svelte/recommended'," : ''}
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    ${packageConfig.name === 'vue' ? "extraFileExtensions: ['.vue']," : ''}
    ${packageConfig.name === 'svelte' ? "extraFileExtensions: ['.svelte']," : ''}
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    ${packageConfig.name === 'react' ? "'react', 'react-hooks'," : ''}
    ${packageConfig.name === 'vue' ? "'vue'," : ''}
    ${packageConfig.name === 'svelte' ? "'svelte'," : ''}
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prettier/prettier': 'error',
    ${packageConfig.name === 'react' ? "'react/react-in-jsx-scope': 'off'," : ''}
    ${packageConfig.name === 'react' ? "'react/prop-types': 'off'," : ''}
  },
  ignorePatterns: ['dist/**', '**/*.d.ts', '**/*.js', 'vite.config.*'],
  ...(packageConfig.name === 'svelte' ? {
    overrides: [
      {
        files: ['**/*.svelte'],
        processor: 'svelte3/svelte3',
        rules: {
          'import/first': 'off',
          'import/no-mutable-exports': 'off',
        },
      },
    ]
  } : {}),
  settings: {
    ${packageConfig.name === 'react' ? "react: {
      version: 'detect',
    }," : ''}
    ${packageConfig.name === 'svelte' ? "'svelte3/typescript': true," : ''}
  },
};
`;
    
    await fs.writeFile(
      path.join(packagePath, '.eslintrc.js'),
      eslintConfig,
      'utf8'
    );
    
    // Create .prettierrc.js
    const prettierConfig = `// @ts-check
const baseConfig = require('../../../.prettierrc.js');

module.exports = {
  ...baseConfig,
  // Add package-specific overrides here if needed
};
`;
    
    await fs.writeFile(
      path.join(packagePath, '.prettierrc.js'),
      prettierConfig,
      'utf8'
    );
    
    // Create vitest.config.ts
    const vitestConfig = `import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
${packageConfig.name === 'react' ? "import react from '@vitejs/plugin-react';\n" : ''}
${packageConfig.name === 'vue' ? "import vue from '@vitejs/plugin-vue';\n" : ''}
${packageConfig.name === 'svelte' ? "import { svelte } from '@sveltejs/vite-plugin-svelte';\n" : ''}

export default defineConfig({
  plugins: [
    ${packageConfig.name === 'react' ? 'react(),' : ''}
    ${packageConfig.name === 'vue' ? 'vue(),' : ''}
    ${packageConfig.name === 'svelte' ? 'svelte({ hot: !process.env.VITEST }),' : ''}
  ],
  test: {
    globals: true,
    environment: '${packageConfig.type === 'frontend' ? 'jsdom' : 'node'}',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/__mocks__/**',
        '**/types/**',
        '**/demo/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@salahor/${packageConfig.name}': resolve(__dirname, 'src'),
    },
  },
});
`;
    
    await fs.writeFile(
      path.join(packagePath, 'vitest.config.ts'),
      vitestConfig,
      'utf8'
    );
    
    // Create test setup file
    const testSetup = `// Test setup file
import { vi } from 'vitest';

// Mock any global browser APIs if needed
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
`;
    
    await fs.writeFile(
      path.join(packagePath, 'test', 'setup.ts'),
      testSetup,
      'utf8'
    );
    
    // Create basic index.ts
    const indexContent = `/**
 * ${packageConfig.name} - ${packageConfig.description}
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
    const typesContent = `/**
 * Type definitions for @salahor/${packageConfig.name}
 * @packageDocumentation
 */

// Export your types here
export interface ${packageConfig.name.split('-').map(word => 
  word.charAt(0).toUpperCase() + word.slice(1)
).join('')}Options {
  // Add your options here
}
`;
    
    await fs.writeFile(
      path.join(packagePath, 'src', 'types.ts'),
      typesContent,
      'utf8'
    );
    
    // Create README.md
    const readmeContent = `# @salahor/${packageConfig.name}

${packageConfig.description}

## Installation

\`\`\`bash
pnpm add @salahor/${packageConfig.name}
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
    
    console.log(`✅ Created ${packageConfig.type} package: @salahor/${packageConfig.name}`);
    
  } catch (error) {
    console.error(`❌ Error creating package @salahor/${packageConfig.name}:`, error.message);
  }
}

async function setupFrontendPackages() {
  console.log('\n🚀 Setting up frontend packages...');
  
  for (const [name, config] of Object.entries(frontendConfigs)) {
    const packagePath = path.join(__dirname, '..', 'packages', 'frontend', name);
    await createPackage(packagePath, {
      name,
      type: 'frontend',
      ...config
    });
  }
  
  console.log('✅ Frontend packages setup complete!');
}

async function setupBackendPackages() {
  console.log('\n🚀 Setting up backend packages...');
  
  for (const [name, config] of Object.entries(backendConfigs)) {
    const packagePath = path.join(__dirname, '..', 'packages', 'backend', name);
    await createPackage(packagePath, {
      name,
      type: 'backend',
      ...config
    });
  }
  
  console.log('✅ Backend packages setup complete!');
}

async function main() {
  console.log('🚀 Setting up frontend and backend packages...');
  
  // Create frontend packages
  await setupFrontendPackages();
  
  // Create backend packages
  await setupBackendPackages();
  
  console.log('\n🎉 All packages have been set up successfully!');
  console.log('\nNext steps:');
  console.log('1. Run `pnpm install` to install all dependencies');
  console.log('2. Run `pnpm run build` to build all packages');
  console.log('3. Run `pnpm test` to run tests');
  console.log('4. Start implementing the actual functionality in each package');
}

main().catch(console.error);
