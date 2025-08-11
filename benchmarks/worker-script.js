// Worker script for benchmarking
import { parentPort } from 'worker_threads';

// Simulate CPU-intensive work
function processTask(data) {
  // Simple CPU-bound task (calculating prime numbers)
  function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    
    let i = 5;
    let w = 2;
    
    while (i * i <= num) {
      if (num % i === 0) return false;
      i += w;
      w = 6 - w;
    }
    
    return true;
  }
  
  // Find the nth prime number
  function findNthPrime(n) {
    let count = 0;
    let num = 2;
    
    while (count < n) {
      if (isPrime(num)) {
        count++;
      }
      num++;
    }
    
    return num - 1;
  }
  
  // Perform the work
  const start = Date.now();
  const result = findNthPrime(data.complexity || 1000);
  const duration = Date.now() - start;
  
  return { result, duration };
}

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  if (message === 'exit') {
    process.exit(0);
  }
  
  try {
    const result = await processTask(message);
    parentPort.postMessage({ result });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});
