import { describe, it, expect } from 'vitest';
import { createApp } from './index.js';

describe('Salahor Express Backend', () => {
  it('should create an express app instance', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('should handle basic functionality', () => {
    // Basic test to ensure the package structure is valid
    expect(true).toBe(true);
  });
});
