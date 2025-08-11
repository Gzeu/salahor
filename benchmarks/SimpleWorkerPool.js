/**
 * Simple WorkerPool implementation for benchmarking
 */

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SimpleWorkerPool {
  constructor(workerScript, options = {}) {
    this.workerScript = workerScript;
    this.options = {
      minWorkers: 1,
      maxWorkers: 4,
      idleTimeout: 30000,
      ...options
    };
    
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
    
    // Initialize workers
    for (let i = 0; i < this.options.minWorkers; i++) {
      this._createWorker();
    }
  }
  
  _createWorker() {
    if (this.workers.length >= this.options.maxWorkers) return null;
    
    const worker = new Worker(this.workerScript, {
      eval: true,
      ...this.options.workerOptions
    });
    
    const workerObj = {
      worker,
      isIdle: true,
      currentTask: null
    };
    
    worker.on('message', (message) => {
      if (workerObj.currentTask) {
        const { resolve } = workerObj.currentTask;
        workerObj.currentTask = null;
        workerObj.isIdle = true;
        this.idleWorkers.push(workerObj);
        resolve(message);
        this._processQueue();
      }
    });
    
    worker.on('error', (error) => {
      if (workerObj.currentTask) {
        const { reject } = workerObj.currentTask;
        workerObj.currentTask = null;
        workerObj.isIdle = true;
        this.idleWorkers.push(workerObj);
        reject(error);
      }
      this._removeWorker(workerObj);
      if (this.workers.length < this.options.minWorkers) {
        this._createWorker();
      }
    });
    
    this.workers.push(workerObj);
    this.idleWorkers.push(workerObj);
    
    return workerObj;
  }
  
  _removeWorker(workerObj) {
    const index = this.workers.indexOf(workerObj);
    if (index !== -1) {
      this.workers.splice(index, 1);
      
      const idleIndex = this.idleWorkers.indexOf(workerObj);
      if (idleIndex !== -1) {
        this.idleWorkers.splice(idleIndex, 1);
      }
      
      workerObj.worker.terminate();
    }
  }
  
  _processQueue() {
    while (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.idleWorkers.shift();
      
      worker.isIdle = false;
      worker.currentTask = task;
      
      try {
        worker.worker.postMessage(task.task, task.transferList);
      } catch (error) {
        worker.isIdle = true;
        this.idleWorkers.push(worker);
        task.reject(error);
      }
    }
  }
  
  execute(task, transferList = []) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        transferList,
        resolve,
        reject
      });
      
      this._processQueue();
    });
  }
  
  async terminate(force = false) {
    const terminationPromises = this.workers.map(worker => {
      if (force) {
        worker.worker.terminate();
        return Promise.resolve();
      }
      return worker.worker.terminate();
    });
    
    await Promise.all(terminationPromises);
    
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
  }
  
  getStats() {
    return {
      total: this.workers.length,
      idle: this.idleWorkers.length,
      busy: this.workers.length - this.idleWorkers.length,
      queued: this.taskQueue.length,
    };
  }
}

export default SimpleWorkerPool;
