/**
 * Worker utilities for salahor
 * Provides zero-dependency Web Worker integration for Node.js
 * @module workers/main
 */

// Environment detection
const envInfo = (() => {
  const nodeVersion = process.versions?.node || '0.0.0';
  const [major, minor] = nodeVersion.split('.').map(Number);
  
  // Check Node.js version support
  const isSupportedVersion = major > 12 || (major === 12 && minor >= 17);
  
  // Check for worker_threads module
  let hasWorkerThreads = false;
  try {
    require.resolve('worker_threads');
    hasWorkerThreads = true;
  } catch (e) {
    hasWorkerThreads = false;
  }
  
  // Check if running with --experimental-worker flag for older Node.js
  const isExperimentalWorker = process.execArgv?.includes('--experimental-worker') || false;
  
  // Determine if workers are supported
  const workersSupported = Boolean(
    hasWorkerThreads && 
    (isSupportedVersion || isExperimentalWorker)
  );
  
  return {
    nodeVersion,
    isSupportedVersion,
    hasWorkerThreads,
    isExperimentalWorker,
    workersSupported,
    getWorkerSupportMessage() {
      if (!hasWorkerThreads) return 'Worker threads are not available in this environment';
      if (!isSupportedVersion && !isExperimentalWorker) {
        return 'Node.js version too old. Use --experimental-worker flag or upgrade to Node.js 12.17+';
      }
      return workersSupported 
        ? 'Worker threads are available' 
        : 'Worker threads are not available';
    }
  };
})();

// Use dynamic imports to avoid loading worker_threads if not needed
let WorkerClass, isMainThread, parentPort, workerData;

try {
  const workerThreads = await import('node:worker_threads');
  WorkerClass = workerThreads.Worker;
  isMainThread = workerThreads.isMainThread;
  parentPort = workerThreads.parentPort;
  workerData = workerThreads.workerData;
} catch (e) {
  // Will be handled by the supportsWorkers() function
}

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/**
 * Runs a module in a worker thread
 * @param {string} modulePath - Path to the worker module
 * @param {any} workerData - Data to pass to the worker
 * @param {Object} [options] - Worker options
 * @param {boolean} [options.envShare=false] - Whether to share environment variables with the worker
 * @param {Array} [options.transferList] - List of transferable objects
 * @param {Object} [options.resourceLimits] - Resource limits for the worker
 * @param {boolean} [options.stdout=false] - Whether to capture stdout
 * @param {boolean} [options.stderr=false] - Whether to capture stderr
 * @param {string[]} [options.argv=[]] - Command line arguments for the worker
 * @param {string[]} [options.execArgv=[]] - Node.js CLI options for the worker
 * @returns {Promise<{data: any, stdout: string, stderr: string}>} Result from the worker
 */
export function runInWorker(modulePath, workerData, {
  envShare = false,
  transferList = [],
  resourceLimits,
  stdout = false,
  stderr = false,
  argv = [],
  execArgv = [],
} = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(modulePath, {
      workerData,
      transferList,
      env: envShare ? process.env : undefined,
      resourceLimits,
      stdout,
      stderr,
      argv,
      execArgv,
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    
    if (stdout) {
      worker.stdout.on('data', (chunk) => {
        stdoutBuf += chunk.toString();
      });
    }
    
    if (stderr) {
      worker.stderr.on('data', (chunk) => {
        stderrBuf += chunk.toString();
      });
    }

    worker.on('message', (message) => {
      resolve({
        data: message,
        stdout: stdoutBuf,
        stderr: stderrBuf
      });
    });

    worker.on('error', (error) => {
      error.stdout = stdoutBuf;
      error.stderr = stderrBuf;
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        const error = new Error(`Worker stopped with exit code ${code}`);
        error.code = code;
        error.stdout = stdoutBuf;
        error.stderr = stderrBuf;
        reject(error);
      }
    });
  });
}

/**
 * Checks if workers are supported in the current environment
 * @returns {Object} Object with support information
 */
export function getWorkerSupport() {
  return {
    supported: envInfo.workersSupported,
    version: envInfo.nodeVersion,
    hasWorkerThreads: envInfo.hasWorkerThreads,
    isExperimental: envInfo.isExperimentalWorker,
    message: envInfo.getWorkerSupportMessage(),
    requirements: {
      minNodeVersion: '12.17.0',
      recommendedNodeVersion: '16.0.0+'
    }
  };
}

/**
 * Checks if workers are supported in the current environment
 * @returns {boolean} True if workers are supported
 */
export function supportsWorkers() {
  return envInfo.workersSupported;
}

// Export worker utilities as default
export default {
  runInWorker,
  supportsWorkers,
  isMainThread: isMainThread,
  workerData: isMainThread ? undefined : workerData,
  parentPort: isMainThread ? undefined : parentPort
};
