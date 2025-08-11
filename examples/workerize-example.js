/**
 * Workerize Example
 * Demonstrates how to use the workerize utility to offload CPU-intensive tasks
 */

import { workerize, terminateWorkerizedFunctions } from '../src/workers/workerize.js';

// CPU-intensive function to workerize
function calculatePrimes(limit) {
  console.log(`Calculating primes up to ${limit}...`);
  
  const primes = [];
  for (let i = 2; i <= limit; i++) {
    let isPrime = true;
    
    // Check if i is a prime number
    for (let j = 2, max = Math.sqrt(i); j <= max; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    
    if (isPrime) {
      primes.push(i);
    }
  }
  
  return {
    limit,
    count: primes.length,
    primes: primes.slice(0, 10), // Return first 10 primes to avoid large data transfer
    message: primes.length > 10 ? `... and ${primes.length - 10} more` : ''
  };
}

// Workerize the function
const calculatePrimesWorkerized = workerize(calculatePrimes, {
  minWorkers: 1,
  maxWorkers: 3,
  workerOptions: {
    // Additional worker options can be specified here
  }
});

// Main function to run the example
async function main() {
  try {
    console.log('Starting workerize example...');
    
    // Execute multiple prime calculations in parallel
    const results = await Promise.all([
      calculatePrimesWorkerized(1000000),
      calculatePrimesWorkerized(2000000),
      calculatePrimesWorkerized(3000000)
    ]);
    
    // Log the results
    results.forEach((result, index) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log(`Found ${result.count} prime numbers up to ${result.limit}`);
      console.log(`First 10 primes: ${result.primes.join(', ')} ${result.message}`);
    });
    
  } catch (error) {
    console.error('Error in workerized function:', error);
  } finally {
    // Clean up worker resources
    await terminateWorkerizedFunctions();
    console.log('\nWorker resources cleaned up');
  }
}

// Run the example
main().catch(console.error);
