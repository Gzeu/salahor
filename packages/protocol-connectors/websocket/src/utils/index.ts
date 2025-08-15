import { promises as fs } from 'fs';
import path from 'path';

/**
 * Development mode flag
 */
export const isDev = process.env.NODE_ENV !== 'production';

/**
 * Development logger utility
 */
export const devLogger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log('[dev]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[warn]', ...args);
    }
  },
  error: (message: string, error?: Error) => {
    if (isDev) {
      console.error('[error]', message, error || '');
    }
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[debug]', ...args);
    }
  }
};

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Resolve a file path relative to the project root
 */
export function resolvePath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

export default {
  isDev,
  devLogger,
  fileExists,
  resolvePath
};
