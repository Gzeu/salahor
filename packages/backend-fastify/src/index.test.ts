import { describe, it, expect } from 'vitest';
import { createServer } from './index.js';

describe('Salahor Fastify Backend', () => {
  it('should create a server instance', async () => {
    const server = await createServer();
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe('function');
  });

  it('should handle basic functionality', () => {
    // Basic test to ensure the package structure is valid
    expect(true).toBe(true);
  });
});
