import { defineConfig } from 'vitest/config';
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
      '@salahor/sse': resolve(__dirname, 'src'),
    },
  },
});