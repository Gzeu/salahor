import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.d.ts',
        '**/index.ts',
        '**/types/**',
        '**/test-utils/**',
      ]
    },
    // Coverage thresholds are set in package.json
  },
  resolve: {
    alias: [
      {
        find: '@salahor/core',
        replacement: resolve(__dirname, 'src/index.ts'),
      },
      {
        find: /^@salahor\/(.*)$/,
        replacement: resolve(__dirname, '../../packages/$1/src'),
      },
    ],
  },
});
