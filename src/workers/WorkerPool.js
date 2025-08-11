/**
 * WorkerPool - Manages a pool of workers for parallel task processing
 * @module workers/WorkerPool
 */

import { EventEmitter } from 'events';
import { createWorker } from '../worker-utils.js';
import { createAsyncQueue } from '../core/asyncQueue.js';

const DEFAULT_OPTIONS = {
  minWorkers: 1,
  maxWorkers: navigator?.hardwareConcurrency || 4,
  idleTimeout: 60000, // 1 minute
  maxQueueSize: 1000,
  workerOptions: {},
};

export class WorkerPool extends EventEmitter {
  /**
   * Create a new WorkerPool
   * @param {string|Function} workerScript - Worker script URL or function
   * @param {Object} [options] - Pool configuration
   * @param {number} [options.minWorkers=1] - Minimum number of workers to keep alive
   * @param {number} [options.maxWorkers=navigator.hardwareConcurrency] - Maximum number of workers
   * @param {number} [options.idleTimeout=60000] - Time in ms before idle workers are terminated
   * @param {number} [options.maxQueueSize=1000] - Maximum queue size before rejecting tasks
   * @param {Object} [options.workerOptions] - Options passed to createWorker
   */
  constructor(workerScript, options = {}) {
    super();
    this.workerScript = workerScript;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    this.workers = new Set();
    this.idleWorkers = new Set();
    this.taskQueue = createAsyncQueue({
      maxSize: this.options.maxQueueSize,
      onOverflow: 'throw',
    });
    
    this.initialize();
  }
  
  /**
   * Initialize the worker pool
   * @private
   */
  initialize() {
    // Start with the minimum number of workers
    for (let i = 0; i < this.options.minWorkers; i++) {
      this.addWorker();
    }
    
    // Start processing tasks
    this.processQueue();
  }
  
  /**
   * Add a new worker to the pool
   * @private
   * @returns {Worker} The created worker
   */
  addWorker() {
    if (this.workers.size >= this.options.maxWorkers) {
      throw new Error(`Maximum worker limit (${this.options.maxWorkers}) reached`);
    }
    
    const worker = createWorker(this.workerScript, this.options.workerOptions);
    const workerInfo = {
      worker,
      idle: true,
      idleTimeout: null,
      taskCount: 0,
    };
    
    this.workers.add(workerInfo);
    this.idleWorkers.add(workerInfo);
    
    // Set up worker event listeners
    worker.on('message', (message) => this.handleWorkerMessage(workerInfo, message));
    worker.on('error', (error) => this.handleWorkerError(workerInfo, error));
    worker.on('exit', (code) => this.handleWorkerExit(workerInfo, code));
    
    this.emit('worker:created', { worker, totalWorkers: this.workers.size });
    return worker;
  }
  
  /**
   * Handle messages from workers
   * @private
   * @param {Object} workerInfo - Worker info object
   * @param {*} message - Received message
   */
  handleWorkerMessage(workerInfo, message) {
    this.emit('message', { worker: workerInfo.worker, message });
  }
  
  /**
   * Handle worker errors
   * @private
   * @param {Object} workerInfo - Worker info object
   * @param {Error} error - Error that occurred
   */
  handleWorkerError(workerInfo, error) {
    this.emit('error', { worker: workerInfo.worker, error });
    this.removeWorker(workerInfo);
  }
  
  /**
   * Handle worker exit
   * @private
   * @param {Object} workerInfo - Worker info object
   * @param {number} code - Exit code
   */
  handleWorkerExit(workerInfo, code) {
    this.workers.delete(workerInfo);
    this.idleWorkers.delete(workerInfo);
    
    if (code !== 0) {
      this.emit('worker:error', { 
        worker: workerInfo.worker, 
        error: new Error(`Worker stopped with exit code ${code}`) 
      });
    }
    
    // Replace the worker if we're below the minimum
    if (this.workers.size < this.options.minWorkers) {
      this.addWorker();
    }
    
    this.emit('worker:exited', { 
      worker: workerInfo.worker, 
      code, 
      totalWorkers: this.workers.size 
    });
  }
  
  /**
   * Remove a worker from the pool
   * @private
   * @param {Object} workerInfo - Worker info object
   */
  removeWorker(workerInfo) {
    clearTimeout(workerInfo.idleTimeout);
    this.idleWorkers.delete(workerInfo);
    this.workers.delete(workerInfo);
    
    try {
      if (workerInfo.worker.terminate) {
        workerInfo.worker.terminate();
      }
    } catch (error) {
      this.emit('error', { 
        worker: workerInfo.worker, 
        error: new Error(`Failed to terminate worker: ${error.message}`) 
      });
    }
  }
  
  /**
   * Process tasks from the queue
   * @private
   */
  async processQueue() {
    for await (const task of this.taskQueue.iterator) {
      const worker = await this.getAvailableWorker();
      this.executeTask(worker, task);
    }
  }
  
  /**
   * Get an available worker or create a new one if possible
   * @private
   * @returns {Promise<Object>} Available worker info
   */
  async getAvailableWorker() {
    // Try to get an idle worker first
    for (const workerInfo of this.idleWorkers) {
      this.idleWorkers.delete(workerInfo);
      clearTimeout(workerInfo.idleTimeout);
      workerInfo.idle = false;
      return workerInfo;
    }
    
    // If no idle workers and we can create more, add one
    if (this.workers.size < this.options.maxWorkers) {
      return { 
        worker: this.addWorker(), 
        idle: false, 
        taskCount: 0 
      };
    }
    
    // Wait for a worker to become available
    return new Promise((resolve) => {
      const checkWorker = () => {
        for (const workerInfo of this.idleWorkers) {
          this.idleWorkers.delete(workerInfo);
          clearTimeout(workerInfo.idleTimeout);
          workerInfo.idle = false;
          return resolve(workerInfo);
        }
        
        // Check again on the next tick
        setTimeout(checkWorker, 10);
      };
      
      checkWorker();
    });
  }
  
  /**
   * Execute a task on a worker
   * @private
   * @param {Object} workerInfo - Worker info object
   * @param {Object} task - Task to execute
   */
  async executeTask(workerInfo, task) {
    const { data, transfer, resolve, reject } = task;
    
    try {
      workerInfo.taskCount++;
      
      // Set up message handler for this task
      const onMessage = (message) => {
        if (message.type === 'result' || message.type === 'error') {
          cleanup();
          
          if (message.type === 'error') {
            const error = new Error(message.error?.message || 'Worker error');
            Object.assign(error, message.error);
            reject(error);
          } else {
            resolve(message.result);
          }
        }
      };
      
      // Set up error handler for this task
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      
      // Clean up event listeners
      const cleanup = () => {
        workerInfo.worker.off('message', onMessage);
        workerInfo.worker.off('error', onError);
        this.returnWorker(workerInfo);
      };
      
      // Set up event listeners
      workerInfo.worker.on('message', onMessage);
      workerInfo.worker.on('error', onError);
      
      // Post the task to the worker
      workerInfo.worker.postMessage({
        type: 'task',
        data,
      }, transfer || []);
      
    } catch (error) {
      this.returnWorker(workerInfo);
      reject(error);
    }
  }
  
  /**
   * Return a worker to the idle pool
   * @private
   * @param {Object} workerInfo - Worker info object
   */
  returnWorker(workerInfo) {
    workerInfo.taskCount--;
    
    // If we have more than the minimum workers and this one is idle, remove it
    if (this.workers.size > this.options.minWorkers && workerInfo.taskCount === 0) {
      clearTimeout(workerInfo.idleTimeout);
      workerInfo.idleTimeout = setTimeout(() => {
        if (this.workers.size > this.options.minWorkers) {
          this.removeWorker(workerInfo);
        }
      }, this.options.idleTimeout);
    } else if (workerInfo.taskCount === 0) {
      // Otherwise, just mark as idle
      workerInfo.idle = true;
      this.idleWorkers.add(workerInfo);
    }
  }
  
  /**
   * Execute a task using the worker pool
   * @param {*} data - Data to send to the worker
   * @param {Array} [transfer] - Transferable objects
   * @returns {Promise<*>} Task result
   */
  async execute(data, transfer) {
    return new Promise((resolve, reject) => {
      this.taskQueue.enqueue({ data, transfer, resolve, reject });
    });
  }
  
  /**
   * Get the current number of workers
   * @returns {Object} Worker counts
   */
  getWorkerStats() {
    return {
      total: this.workers.size,
      idle: this.idleWorkers.size,
      busy: this.workers.size - this.idleWorkers.size,
      queueSize: this.taskQueue.size,
    };
  }
  
  /**
   * Terminate all workers and clear the queue
   */
  async terminate() {
    // Clear the task queue
    this.taskQueue.close();
    
    // Terminate all workers
    const terminationPromises = Array.from(this.workers).map((workerInfo) => {
      return new Promise((resolve) => {
        if (workerInfo.worker.terminate) {
          workerInfo.worker.terminate();
        }
        resolve();
      });
    });
    
    await Promise.all(terminationPromises);
    
    this.workers.clear();
    this.idleWorkers.clear();
    
    this.emit('terminated');
  }
}

export default WorkerPool;
