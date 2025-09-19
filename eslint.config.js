// ESLint 9.x Flat Config with Security and Performance Rules
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import securityPlugin from 'eslint-plugin-security';
import sonarPlugin from 'eslint-plugin-sonarjs';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Base JavaScript rules
  js.configs.recommended,
  
  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2025,
        sourceType: 'module',
        project: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'security': securityPlugin,
      'sonarjs': sonarPlugin,
    },
    rules: {
      // TypeScript specific rules
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,
      
      // Security rules
      ...securityPlugin.configs.recommended.rules,
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      
      // SonarJS code quality rules
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/max-switch-cases': ['error', 30],
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-collection-size-mischeck': 'error',
      'sonarjs/no-duplicate-string': ['error', 3],
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-element-overwrite': 'error',
      'sonarjs/no-empty-collection': 'error',
      'sonarjs/no-extra-arguments': 'error',
      'sonarjs/no-gratuitous-expressions': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-ignored-return': 'error',
      'sonarjs/no-inverted-boolean-check': 'error',
      'sonarjs/no-nested-switch': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-one-iteration-loop': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-same-line-conditional': 'error',
      'sonarjs/no-small-switch': 'error',
      'sonarjs/no-unused-collection': 'error',
      'sonarjs/no-use-of-empty-return-value': 'error',
      'sonarjs/no-useless-catch': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      'sonarjs/prefer-object-literal': 'error',
      'sonarjs/prefer-single-boolean-return': 'error',
      'sonarjs/prefer-while': 'error',
      
      // Performance and modern JavaScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      
      // Modern ES2025 features
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-destructuring': ['error', {
        array: true,
        object: true
      }],
      
      // Error prevention
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      'no-var': 'error',
      
      // Best practices for performance
      'prefer-object-spread': 'error',
      'prefer-exponentiation-operator': 'error',
      'prefer-numeric-literals': 'error',
      
      // Memory leak prevention
      'no-global-assign': 'error',
      'no-implicit-globals': 'error',
      'no-loop-func': 'error',
      
      // TypeScript 5.6 specific
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
    },
  },
  
  // Test files configuration
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  
  // Configuration files
  {
    files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'security/detect-non-literal-require': 'off',
    },
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '*.d.ts',
      '.next/**',
      '.vercel/**',
      '*.tsbuildinfo',
    ],
  },
  
  // Prettier config (must be last)
  prettierConfig,
];
