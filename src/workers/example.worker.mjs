/**
 * Example worker for salahor
 * Demonstrates a CPU-intensive task that benefits from being run in a worker
 * @module workers/example.worker
 */

import { parentPort, workerData } from 'node:worker_threads';

/**
 * A CPU-intensive task that benefits from being run in a worker
 * @param {Object} data - Input data for the task
 * @returns {Promise<Object>} The result of the computation
 */
async function processData(data) {
  // Simulate CPU-intensive work
  const result = {
    input: data,
    processedAt: new Date().toISOString(),
    // Add some computed properties
    computed: {
      // Example: Calculate the sum of all numeric values in the input
      sum: Object.values(data).reduce((sum, val) => {
        const num = Number(val);
        return !isNaN(num) ? sum + num : sum;
      }, 0),
      // Example: Count the number of properties
      propertyCount: Object.keys(data).length,
    },
  };
  
  // Simulate some async work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return result;
}

// Handle messages from the main thread
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      const result = await processData(message);
      parentPort.postMessage({ success: true, data: result });
    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    }
  });
}

// For testing purposes, immediately process workerData if it exists
if (workerData) {
  processData(workerData)
    .then((result) => {
      if (parentPort) {
        parentPort.postMessage({ success: true, data: result });
      }
    })
    .catch((error) => {
      if (parentPort) {
        parentPort.postMessage({
          success: false,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        });
      }
    });
}
