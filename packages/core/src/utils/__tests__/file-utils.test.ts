import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileExists, fileExistsSync } from '../file-utils';

// Create a mock implementation map to store our mock functions
const mockImplementations = {
  access: vi.fn().mockResolvedValue(undefined),
  accessSync: vi.fn(),
};

// Mock the modules with factory functions to ensure proper hoisting
vi.mock('node:fs', () => ({
  accessSync: (...args: any[]) => mockImplementations.accessSync(...args),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
  default: {
    accessSync: (...args: any[]) => mockImplementations.accessSync(...args),
    constants: {
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1,
    },
  },
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: any[]) => mockImplementations.access(...args),
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
  default: {
    access: (...args: any[]) => mockImplementations.access(...args),
    constants: {
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1,
    },
  },
}));

// Helper to set up mock for successful file access
function mockFileAccessSuccess() {
  mockImplementations.access.mockResolvedValue(undefined);
  mockImplementations.accessSync.mockImplementation(() => {});
}

// Helper to set up mock for file not found
function mockFileNotFound() {
  const error = new Error('File not found');
  (error as any).code = 'ENOENT';
  mockImplementations.access.mockRejectedValue(error);
  mockImplementations.accessSync.mockImplementation(() => { throw error; });
}

// Helper to set up mock for file access with specific permissions
function mockFileAccessWithPermissions(permissions: number) {
  mockImplementations.accessSync.mockImplementation((_path: string, mode?: number) => {
    if (mode && (mode & permissions) !== mode) {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      throw error;
    }
  });
  
  mockImplementations.access.mockImplementation(async (_path: string, mode?: number) => {
    if (mode && (mode & permissions) !== mode) {
      const error = new Error('Permission denied');
      (error as any).code = 'EACCES';
      throw error;
    }
  });
}



describe('file-utils', () => {
  const testFile = '/path/to/test.txt';
  
  beforeEach(() => {
    // Reset all mocks and set up default success case
    vi.clearAllMocks();
    mockFileAccessSuccess();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fileExists', () => {
    it('should return true when file exists with default permissions', async () => {
      // Arrange - mockFileAccessSuccess is already called in beforeEach
      
      // Act
      const exists = await fileExists(testFile);
      
      // Assert
      expect(exists).toBe(true);
      expect(mockImplementations.access).toHaveBeenCalledTimes(1);
      // Default is checkReadable: true, which uses R_OK (4)
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.access).toHaveBeenCalledWith(expectedPath, 4);
    });

    it('should return false when file does not exist', async () => {
      // Arrange
      mockFileNotFound();
      
      // Act
      const exists = await fileExists(testFile);
      
      // Assert
      expect(exists).toBe(false);
      expect(mockImplementations.access).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.access).toHaveBeenCalledWith(expectedPath, 4);
    });

    it('should return false when file is not readable', async () => {
      // Arrange
      mockFileAccessWithPermissions(0); // No permissions
      
      // Act
      const exists = await fileExists(testFile);
      
      // Assert
      expect(exists).toBe(false);
      expect(mockImplementations.access).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.access).toHaveBeenCalledWith(expectedPath, 4);
    });

    it('should check for existence only when checkReadable is false', async () => {
      // Arrange
      
      // Act
      const exists = await fileExists(testFile, { checkReadable: false });
      
      // Assert
      expect(exists).toBe(true);
      expect(mockImplementations.access).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.access).toHaveBeenCalledWith(expectedPath, 0);
    });

    it('should check for write permission when checkWritable is true', async () => {
      // Arrange
      
      // Act
      const exists = await fileExists(testFile, { checkWritable: true });
      
      // Assert
      expect(exists).toBe(true);
      expect(mockImplementations.access).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.access).toHaveBeenCalledWith(expectedPath, 6); // R_OK | W_OK = 4 | 2 = 6
    });
  });

  describe('fileExistsSync', () => {
    it('should return true when file exists with default permissions', () => {
      // Arrange - mockFileAccessSuccess is already called in beforeEach
      
      // Act
      const exists = fileExistsSync(testFile);
      
      // Assert
      expect(exists).toBe(true);
      expect(mockImplementations.accessSync).toHaveBeenCalledTimes(1);
      // Default is checkReadable: true, which uses R_OK (4)
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.accessSync).toHaveBeenCalledWith(expectedPath, 4);
    });

    it('should return false when file does not exist', () => {
      // Arrange
      mockFileNotFound();
      
      // Act
      const exists = fileExistsSync(testFile);
      
      // Assert
      expect(exists).toBe(false);
      expect(mockImplementations.accessSync).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.accessSync).toHaveBeenCalledWith(expectedPath, 4);
    });

    it('should return false when file is not readable', () => {
      // Arrange
      mockFileAccessWithPermissions(0); // No permissions
      
      // Act
      const exists = fileExistsSync(testFile);
      
      // Assert
      expect(exists).toBe(false);
      expect(mockImplementations.accessSync).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.accessSync).toHaveBeenCalledWith(expectedPath, 4);
    });

    it('should check for existence only when checkReadable is false', () => {
      // Arrange
      
      // Act
      const exists = fileExistsSync(testFile, { checkReadable: false });
      
      // Assert
      expect(exists).toBe(true);
      expect(mockImplementations.accessSync).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.accessSync).toHaveBeenCalledWith(expectedPath, 0);
    });

    it('should check for write permission when checkWritable is true', () => {
      // Arrange
      
      // Act
      const exists = fileExistsSync(testFile, { checkWritable: true });
      
      // Assert
      expect(exists).toBe(true);
      expect(mockImplementations.accessSync).toHaveBeenCalledTimes(1);
      const expectedPath = testFile.startsWith('/') ? testFile : expect.stringContaining(testFile);
      expect(mockImplementations.accessSync).toHaveBeenCalledWith(expectedPath, 6); // R_OK | W_OK = 4 | 2 = 6
    });
  });
});
