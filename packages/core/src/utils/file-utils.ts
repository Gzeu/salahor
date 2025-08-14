import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';

export interface FileCheckOptions {
  /**
   * The base directory to resolve relative paths from
   * @default process.cwd()
   */
  cwd?: string;
  
  /**
   * Whether to check if the file exists and is readable
   * @default true
   */
  checkReadable?: boolean;
  
  /**
   * Whether to check if the file exists and is writable
   * @default false
   */
  checkWritable?: boolean;
  
  /**
   * Whether to check if the file exists and is executable
   * @default false
   */
  checkExecutable?: boolean;
}

/**
 * Check if a file exists and has the specified access rights
 * @param filePath Path to the file to check
 * @param options Check options
 * @returns Promise that resolves to true if the file exists and has the required access, false otherwise
 */
export async function fileExists(
  filePath: string,
  options: FileCheckOptions = {}
): Promise<boolean> {
  const {
    cwd = process.cwd(),
    checkReadable = true,
    checkWritable = false,
    checkExecutable = false,
  } = options;

  const resolvedPath = filePath.startsWith('/') 
    ? filePath 
    : join(cwd, filePath);

  try {
    let mode = 0;
    if (checkReadable) mode |= constants.R_OK;
    if (checkWritable) mode |= constants.W_OK;
    if (checkExecutable) mode |= constants.X_OK;
    
    await access(resolvedPath, mode);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Synchronously check if a file exists and has the specified access rights
 * @param filePath Path to the file to check
 * @param options Check options
 * @returns True if the file exists and has the required access, false otherwise
 */
import { accessSync, constants as fsConstants } from 'node:fs';

export function fileExistsSync(
  filePath: string,
  options: Omit<FileCheckOptions, 'cwd'> & { cwd?: string } = {}
): boolean {
  const {
    cwd = process.cwd(),
    checkReadable = true,
    checkWritable = false,
    checkExecutable = false,
  } = options;

  const resolvedPath = filePath.startsWith('/')
    ? filePath
    : join(cwd, filePath);

  try {
    let mode = 0;
    if (checkReadable) mode |= fsConstants.R_OK;
    if (checkWritable) mode |= fsConstants.W_OK;
    if (checkExecutable) mode |= fsConstants.X_OK;
    
    accessSync(resolvedPath, mode);
    return true;
  } catch (error) {
    return false;
  }
}
