import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',  // or 'jsdom' if you need a browser environment
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: /^@salahor\/websocket(\/.*)?$/,
        replacement: resolve(__dirname, './src') + '$1',
      },
    ],
  },
});
