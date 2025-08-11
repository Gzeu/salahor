/**
 * Optimized WorkerPool with better resource management and performance
 * @module workers/OptimizedWorkerPool
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cpus } from 'os';
import EventEmitter from 'events';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default options for the worker pool
const DEFAULT_OPTIONS = {
  minWorkers: 1,
  maxWorkers: Math.max(1, cpus().length - 1),
  idleTimeout: 30000, // 30 seconds
  maxQueueSize: 1000,
  workerOptions: {},
  onWorkerCreated: null,
  onWorkerTerminated: null,
};

// Worker states
const WORKER_STATES = {
  IDLE: 'idle',
  BUSY: 'busy',
  TERMINATING: 'terminating',
  TERMINATED: 'terminated',
};

/**
 * Optimized WorkerPool with better resource management
 */
export class OptimizedWorkerPool extends EventEmitter {
  /**
   * Create a new OptimizedWorkerPool
   * @param {string|Function} workerScript - Worker script or function
   * @param {Object} [options] - Pool options
   */
  constructor(workerScript, options = {}) {
    super();
    this.workerScript = workerScript;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Use Map for workers and Set for idle workers for better performance
    this.workers = new Map(); // workerId -> { worker, state, lastUsed, currentTask }
    this.idleWorkers = new Set(); // Set of idle worker IDs
    this.taskQueue = [];
    this.workerCounter = 0;
    this.isTerminating = false;
    this._isProcessingQueue = false;
    
    // Pre-compile worker script if it's a function
    if (typeof workerScript === 'function') {
      this._cachedWorkerScript = this._prepareWorkerScript();
    }
    
    // Create initial workers
    this._ensureMinWorkers();
    
    // Use requestIdleCallback for non-critical background tasks
    this._scheduleIdleTasks();
  }

  /**
   * Execute a task in the worker pool
   * @param {any} task - Task data to send to the worker
   * @param {Array} [transferList] - Optional transferable objects
   * @returns {Promise<any>} Result from the worker
   */
  async execute(task, transferList = []) {
    if (this.isTerminating) {
      throw new Error('Worker pool is terminating');
    }

    // Check queue size without creating a new array
    if (this.taskQueue.length >= this.options.maxQueueSize) {
      throw new Error('Worker pool queue is full');
    }

    // Try to find an available worker immediately
    const workerId = this._getAvailableWorker();
    if (workerId) {
      return this._executeImmediate(workerId, task, transferList);
    }

    // If we can create a new worker, do it immediately
    if (this.workers.size < this.options.maxWorkers) {
      const newWorkerId = this._createWorker();
      if (newWorkerId) {
        return this._executeImmediate(newWorkerId, task, transferList);
      }
    }

    // Otherwise, queue the task
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        transferList,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });
      
      // Process queue on next tick to avoid blocking
      if (this.taskQueue.length === 1) {
        setImmediate(() => this._processQueue());
      }
    });
  }

  /**
   * Get current pool statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    const stats = {
      total: this.workers.size,
      idle: 0,
      busy: 0,
      terminating: 0,
      terminated: 0,
      queued: this.taskQueue.length,
    };

    for (const worker of this.workers.values()) {
      stats[worker.state] = (stats[worker.state] || 0) + 1;
    }

    return stats;
  }

  /**
   * Terminate all workers and clean up
   * @param {boolean} [force=false] - Force immediate termination
   * @returns {Promise<void>}
   */
  async terminate(force = false) {
    if (this.isTerminating) return;
    this.isTerminating = true;
    
    // Clear any pending tasks
    this.taskQueue = [];
    
    // Terminate all workers
    const terminationPromises = [];
    
    for (const [id, workerData] of this.workers.entries()) {
      if (force) {
        this._terminateWorker(id, true);
      } else {
        terminationPromises.push(
          this._terminateWorker(id, false)
            .catch(error => console.error(`Error terminating worker ${id}:`, error))
        );
      }
    }
    
    await Promise.all(terminationPromises);
  }

  /**
   * Execute a task immediately on an available worker
   * @private
   */
  _executeImmediate(workerId, task, transferList) {
    return new Promise((resolve, reject) => {
      const taskWrapper = { task, transferList, resolve, reject };
      this._assignTask(workerId, taskWrapper);
    });
  }

  /**
   * Process the task queue
   * @private
   */
  async _processQueue() {
    // Prevent multiple concurrent queue processing
    if (this._isProcessingQueue) return;
    this._isProcessingQueue = true;
    
    try {
      // Process tasks in batches to avoid blocking
      const maxBatchSize = 10;
      let processed = 0;
      
      while (this.taskQueue.length > 0 && processed < maxBatchSize) {
        const workerId = this._getAvailableWorker();
        if (!workerId) {
          // No more workers available, check if we can create more
          if (this.workers.length < this.options.maxWorkers) {
            // Create a new worker and continue processing
            const newWorkerId = await this._createWorker();
            if (!newWorkerId) break;
            continue;
          }
          break;
        }
        
        const task = this.taskQueue.shift();
        if (!task) break;
        
        this._assignTask(workerId, task);
        processed++;
      }
      
      // If there are still tasks, schedule the next batch
      if (this.taskQueue.length > 0) {
        setImmediate(() => this._processQueue());
      }
    } finally {
      this._isProcessingQueue = false;
    }
  }

  /**
   * Get an available worker or create a new one
   * @private
   */
  _getAvailableWorker() {
    // First check idle workers
    for (const workerId of this.idleWorkers) {
      const worker = this.workers.get(workerId);
      if (worker && worker.state === WORKER_STATES.IDLE) {
        return workerId;
      }
    }
    
    // If no idle workers and we can create more, return null to indicate a new worker is needed
    if (this.workers.size < this.options.maxWorkers) {
      return null;
    }
    
    // No workers available and we can't create more
    return false;
  }

  /**
   * Create a new worker
   * @private
   */
  _createWorker() {
    if (this.workers.size >= this.options.maxWorkers) {
      return null;
    }
    
    const workerId = `worker-${++this.workerCounter}`;
    const workerScript = this._prepareWorkerScript();
    
    // Create worker with optimized options
    const worker = new Worker(workerScript, { 
      eval: true,
      // Reuse the same environment for all workers
      env: { NODE_ENV: 'production' },
      // Disable worker thread debugging for better performance
      execArgv: process.execArgv.filter(arg => !arg.includes('--inspect')),
      ...this.options.workerOptions
    });
    
    // Set up worker event handlers
    const workerData = {
      worker,
      state: WORKER_STATES.IDLE,
      lastUsed: Date.now(),
      currentTask: null,
    };
    
    worker.on('message', (message) => this._handleWorkerMessage(workerId, message));
    worker.on('error', (error) => this._handleWorkerError(workerId, error));
    worker.on('exit', (code) => this._handleWorkerExit(workerId, code));
    
    this.workers.set(workerId, workerData);
    
    // Notify if callback is provided
    if (typeof this.options.onWorkerCreated === 'function') {
      this.options.onWorkerCreated(workerId);
    }
    
    return workerId;
  }

  /**
   * Assign a task to a worker
   * @private
   */
  _assignTask(workerId, taskWrapper) {
    const workerData = this.workers.get(workerId);
    if (!workerData || workerData.state !== WORKER_STATES.IDLE) {
      return;
    }
    
    workerData.state = WORKER_STATES.BUSY;
    workerData.currentTask = {
      resolve: taskWrapper.resolve,
      reject: taskWrapper.reject,
      startedAt: Date.now(),
    };
    
    // Send task to worker
    try {
      workerData.worker.postMessage(taskWrapper.task, taskWrapper.transferList);
    } catch (error) {
      // If posting fails, clean up and reject the task
      workerData.state = WORKER_STATES.IDLE;
      workerData.currentTask = null;
      taskWrapper.reject(error);
      
      // Try to process next task
      this._processQueue();
    }
  }

  /**
   * Handle worker message
   * @private
   */
  _handleWorkerMessage(workerId, message) {
    const workerData = this.workers.get(workerId);
    if (!workerData) return;
    
    const { currentTask } = workerData;
    if (!currentTask) return;
    
    // Resolve or reject the task
    if (message.error) {
      const error = new Error(message.error.message || 'Worker error');
      error.name = message.error.name || 'WorkerError';
      error.stack = message.error.stack;
      currentTask.reject(error);
    } else {
      currentTask.resolve(message.result);
    }
    
    // Reset worker state
    workerData.state = WORKER_STATES.IDLE;
    workerData.lastUsed = Date.now();
    workerData.currentTask = null;
    
    // Process next task
    this._processQueue();
  }

  /**
   * Handle worker error
   * @private
   */
  _handleWorkerError(workerId, error) {
    const workerData = this.workers.get(workerId);
    if (!workerData) return;
    
    // If there's an active task, reject it
    if (workerData.currentTask) {
      workerData.currentTask.reject(error);
      workerData.currentTask = null;
    }
    
    // Mark worker as terminated
    workerData.state = WORKER_STATES.TERMINATED;
    
    // Try to create a new worker to replace the failed one
    if (!this.isTerminating) {
      this._createWorker();
    }
    
    // Process next task if any
    this._processQueue();
  }

  /**
   * Handle worker exit
   * @private
   */
  _handleWorkerExit(workerId, code) {
    const workerData = this.workers.get(workerId);
    if (!workerData) return;
    
    // If worker exited with an error and has a current task, reject it
    if (code !== 0 && workerData.currentTask) {
      workerData.currentTask.reject(
        new Error(`Worker exited with code ${code}`)
      );
    }
    
    // Clean up
    this.workers.delete(workerId);
    
    // Notify if callback is provided
    if (typeof this.options.onWorkerTerminated === 'function') {
      this.options.onWorkerTerminated(workerId, code);
    }
    
    // If we're not terminating and need more workers, create one
    if (!this.isTerminating && this.workers.size < this.options.minWorkers) {
      this._createWorker();
    }
  }

  /**
   * Terminate a worker
   * @private
   */
  async _terminateWorker(workerId, force = false) {
    const workerData = this.workers.get(workerId);
    if (!workerData) return;
    
    // Skip if already terminating/terminated
    if ([WORKER_STATES.TERMINATING, WORKER_STATES.TERMINATED].includes(workerData.state)) {
      return;
    }
    
    // Reject current task if any
    if (workerData.currentTask) {
      workerData.currentTask.reject(new Error('Worker is terminating'));
      workerData.currentTask = null;
    }
    
    // Mark as terminating
    workerData.state = WORKER_STATES.TERMINATING;
    
    try {
      // Try to terminate gracefully if not forced
      if (!force && typeof workerData.worker.terminate === 'function') {
        await workerData.worker.terminate();
      } else {
        // Force termination
        workerData.worker.terminate();
      }
    } catch (error) {
      console.error(`Error terminating worker ${workerId}:`, error);
    } finally {
      // Clean up
      this.workers.delete(workerId);
      
      // Notify if callback is provided
      if (typeof this.options.onWorkerTerminated === 'function') {
        this.options.onWorkerTerminated(workerId, 0);
      }
    }
  }

  /**
   * Ensure minimum number of workers are running
   * @private
   */
  _ensureMinWorkers() {
    const needed = Math.max(0, this.options.minWorkers - this.workers.size);
    // Create workers in batches to avoid blocking the event loop
    const createBatch = (count, batchSize = 2) => {
      const batch = Math.min(count, batchSize);
      for (let i = 0; i < batch; i++) {
        this._createWorker();
      }
      if (count > batchSize) {
        setTimeout(() => createBatch(count - batchSize, batchSize), 0);
      }
    };
    
    if (needed > 0) {
      createBatch(needed);
    }
  }

  /**
   * Prepare worker script with optimizations
   * @private
   */
  _prepareWorkerScript() {
    if (typeof this.workerScript !== 'function') {
      return this.workerScript;
    }
    
    // Pre-compile the worker function to string once
    if (!this._cachedWorkerScript) {
      this._cachedWorkerScript = `
        const { parentPort } = require('worker_threads');
        const workerFn = ${this.workerScript.toString()};
        
        // Single event listener for better performance
        parentPort.on('message', async (message) => {
          try {
            const result = await workerFn(message);
            parentPort.postMessage({ result });
          } catch (error) {
            parentPort.postMessage({ 
              error: {
                message: error.message,
                name: error.name,
                stack: error.stack
              }
            });
          }
        });
      `;
    }
    
    return this._cachedWorkerScript;
  }

  /**
   * Start the idle worker reaper
   * @private
   */
  _scheduleIdleTasks() {
    // Use requestIdleCallback when available, fall back to setTimeout
    if (typeof requestIdleCallback === 'function') {
      if (this._idleCallback) {
        cancelIdleCallback(this._idleCallback);
      }
      
      this._idleCallback = requestIdleCallback(
        () => {
          this._checkIdleWorkers();
          this._checkQueue();
          this._scheduleIdleTasks();
        },
        { timeout: 1000 }
      );
    } else {
      // Fallback to setTimeout with a reasonable interval
      if (this._idleTimeout) {
        clearTimeout(this._idleTimeout);
      }
      
      this._idleTimeout = setTimeout(() => {
        this._checkIdleWorkers();
        this._checkQueue();
        this._scheduleIdleTasks();
      }, 1000);
    }
  }
  
  _checkIdleWorkers() {
    if (this.isTerminating) return;
    
    const now = Date.now();
    const excess = this.workers.length - this.options.minWorkers;
    
    // Only proceed if we have excess workers
    if (excess <= 0) return;
    
    // Find idle workers that can be terminated
    const idleWorkers = [];
    for (let i = 0; i < this.workers.length; i++) {
      const worker = this.workers[i];
      if (worker.state === WORKER_STATES.IDLE && 
          now - worker.lastUsed > this.options.idleTimeout) {
        idleWorkers.push(worker.id);
        if (idleWorkers.length >= excess) break;
      }
    }
    
    // Terminate the idle workers
    for (const workerId of idleWorkers) {
      this._terminateWorker(workerId);
    }
  }
  
  _checkQueue() {
    // If we have tasks in the queue and available workers, process them
    if (this.taskQueue.length > 0 && this._getAvailableWorker()) {
      this._processQueue();
    }
  }
}

export default OptimizedWorkerPool;
