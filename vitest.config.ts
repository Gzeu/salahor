import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/build/**',
        '**/scripts/**'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        }
      }
    },
    include: [
      'packages/**/src/**/*.{test,spec}.{js,ts,tsx}',
      'packages/**/tests/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '.git/'
    ]
  }
})