/**
 * Worker Pool Example
 * Demonstrates how to use the WorkerPool class to manage a pool of workers
 */

import { WorkerPool } from '../src/workers/WorkerPool.js';

// Example worker function that processes CPU-intensive tasks
function workerFunction() {
  // This function runs in the worker thread
  self.onmessage = async function(e) {
    const { type, data } = e.data;
    
    if (type === 'task') {
      try {
        // Simulate CPU-intensive work
        const result = processData(data);
        
        // Send the result back to the main thread
        self.postMessage({ 
          type: 'result', 
          result 
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        });
      }
    }
  };
  
  // Example data processing function
  function processData(data) {
    // This is a CPU-intensive operation
    let result = 0;
    for (let i = 0; i < data.iterations || 1000000; i++) {
      result += Math.sqrt(i) * Math.random();
    }
    
    return {
      input: data,
      result: result,
      processedAt: new Date().toISOString(),
      workerId: self.name || 'anonymous'
    };
  }
}

// Main execution
async function main() {
  console.log('Starting WorkerPool example...');
  
  // Create a worker pool with 2-4 workers
  const pool = new WorkerPool(workerFunction, {
    minWorkers: 2,
    maxWorkers: 4,
    idleTimeout: 5000, // 5 seconds
    workerOptions: {
      // Any options to pass to the worker
    }
  });
  
  // Listen to pool events
  pool.on('worker:created', ({ worker, totalWorkers }) => {
    console.log(`Worker created. Total workers: ${totalWorkers}`);
  });
  
  pool.on('worker:exited', ({ worker, code, totalWorkers }) => {
    console.log(`Worker exited with code ${code}. Total workers: ${totalWorkers}`);
  });
  
  pool.on('error', ({ worker, error }) => {
    console.error('Worker error:', error);
  });
  
  // Execute multiple tasks in parallel
  const tasks = [
    { iterations: 1000000, taskId: 'task-1' },
    { iterations: 2000000, taskId: 'task-2' },
    { iterations: 1500000, taskId: 'task-3' },
    { iterations: 3000000, taskId: 'task-4' },
    { iterations: 500000, taskId: 'task-5' },
  ];
  
  console.log('Starting tasks...');
  const startTime = Date.now();
  
  try {
    // Execute all tasks in parallel using the worker pool
    const results = await Promise.all(
      tasks.map((task, index) => {
        console.log(`Starting task ${task.taskId}`);
        return pool.execute(task);
      })
    );
    
    const duration = Date.now() - startTime;
    console.log(`All tasks completed in ${duration}ms`);
    
    // Log results
    results.forEach((result, index) => {
      console.log(`Task ${index + 1} (${tasks[index].taskId}) result:`, 
        `Worker: ${result.workerId}, ` +
        `Iterations: ${tasks[index].iterations.toLocaleString()}, ` +
        `Time: ${result.processedAt}`
      );
    });
    
    // Show worker stats
    const stats = pool.getWorkerStats();
    console.log('\nWorker pool stats:', {
      ...stats,
      totalTasks: tasks.length,
      averageTasksPerWorker: (tasks.length / stats.total).toFixed(2)
    });
    
  } catch (error) {
    console.error('Error executing tasks:', error);
  } finally {
    // Clean up
    await pool.terminate();
    console.log('Worker pool terminated');
  }
}

// Run the example
main().catch(console.error);
