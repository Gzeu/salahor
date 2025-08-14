import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as envUtils from '../env-utils';

describe('env-utils', () => {
  const originalEnv = { ...process.env };
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsole = { ...console };
  
  // Mock console methods
  const mockConsole = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeAll(() => {
    // Replace console methods
    global.console = { ...console, ...mockConsole };
  });

  afterAll(() => {
    // Restore original process.env
    process.env = { ...originalEnv };
    process.env.NODE_ENV = originalNodeEnv;
    
    // Restore original console
    global.console = originalConsole;
  });

  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(envUtils.isDevelopment()).toBe(true);
    });

    it('should return true when NODE_ENV is dev', () => {
      process.env.NODE_ENV = 'dev';
      expect(envUtils.isDevelopment()).toBe(true);
    });

    it('should return false when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(envUtils.isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(envUtils.isProduction()).toBe(true);
    });

    it('should return true when NODE_ENV is prod', () => {
      process.env.NODE_ENV = 'prod';
      expect(envUtils.isProduction()).toBe(true);
    });

    it('should return false when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(envUtils.isProduction()).toBe(false);
    });
  });

  describe('isTest', () => {
    it('should return false by default', async () => {
      // Save original process.env
      const originalEnv = { ...process.env };
      
      try {
        // Clear test environment variables
        delete process.env.VITEST_WORKER_ID;
        delete process.env.JEST_WORKER_ID;
        process.env.NODE_ENV = 'development';
        
        // Reload the module to get a fresh state
        vi.resetModules();
        const freshEnvUtils = await import('../env-utils');
        
        expect(freshEnvUtils.isTest()).toBe(false);
      } finally {
        // Restore original process.env
        process.env = originalEnv;
        vi.resetModules();
      }
    });

    it('should return true when running in Jest', async () => {
      // Save original process.env
      const originalEnv = { ...process.env };
      
      try {
        // Mock the process.env for this test
        process.env = {
          ...originalEnv,
          JEST_WORKER_ID: '1',
          VITEST_WORKER_ID: undefined
        };
        
        // Re-import the module to get fresh state
        vi.resetModules();
        // Use dynamic import instead of require
        const freshEnvUtils = await import('../env-utils');
        
        expect(freshEnvUtils.isTest()).toBe(true);
      } finally {
        // Always restore original process.env
        process.env = originalEnv;
        // Re-import the module again to restore the original state
        vi.resetModules();
        // Re-import the original module for other tests
        await import('../env-utils');
      }
    });
  });

  describe('devLogger', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let originalDebug: typeof console.debug;
    let originalNodeEnv: string | undefined;

    beforeAll(() => {
      // Save originals
      originalEnv = { ...process.env };
      originalNodeEnv = process.env.NODE_ENV;
      originalDebug = console.debug;
      
      // Mock console.debug
      console.debug = vi.fn();
    });

    afterEach(() => {
      // Clear mocks between tests
      vi.clearAllMocks();
    });

    afterAll(() => {
      // Restore originals
      process.env = originalEnv;
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      console.debug = originalDebug;
    });

    it('should log debug messages in development', async () => {
      // Set up test environment
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      vi.resetModules();
      
      // Import the module fresh
      const freshEnvUtils = await import('../env-utils');
      
      // Test the debug logger
      const testMessage = 'Test debug message';
      freshEnvUtils.devLogger.debug(testMessage);
      
      expect(console.debug).toHaveBeenCalledWith('[DEBUG]', testMessage);
    });

    it('should not log debug messages in production', async () => {
      // Set up production environment
      process.env = { ...originalEnv, NODE_ENV: 'production' };
      vi.resetModules();
      
      // Import the module fresh
      const freshEnvUtils = await import('../env-utils');
      
      // Test the debug logger
      const testMessage = 'Test debug message';
      freshEnvUtils.devLogger.debug(testMessage);
      
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should only log debug messages when DEBUG is set', async () => {
      // Save original environment
      const originalNodeEnv = process.env.NODE_ENV;
      
      try {
        // Test 1: Should not log when in production and DEBUG is not set
        process.env = { ...originalEnv, NODE_ENV: 'production', DEBUG: undefined };
        vi.resetModules();
        
        // Import fresh instance
        let freshEnvUtils = await import('../env-utils');
        
        const testMessage = 'Debug message';
        freshEnvUtils.devLogger.debug(testMessage);
        
        // Should not log in production when DEBUG is not set
        expect(console.debug).not.toHaveBeenCalled();
        
        // Test 2: Should log when DEBUG is set, even in production
        process.env = { ...originalEnv, NODE_ENV: 'production', DEBUG: '1' };
        vi.resetModules();
        vi.clearAllMocks();
        
        // Import fresh instance again
        freshEnvUtils = await import('../env-utils');
        
        freshEnvUtils.devLogger.debug(testMessage);
        
        // Should log when DEBUG is set, even in production
        expect(console.debug).toHaveBeenCalledWith('[DEBUG]', testMessage);
      } finally {
        // Restore original environment
        process.env = { ...originalEnv };
        if (originalNodeEnv !== undefined) {
          process.env.NODE_ENV = originalNodeEnv;
        } else {
          delete process.env.NODE_ENV;
        }
        vi.resetModules();
      }
    });
  });
});
