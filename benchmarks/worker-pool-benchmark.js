/**
 * Benchmark for comparing WorkerPool and OptimizedWorkerPool
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cpus } from 'os';
import { readFileSync } from 'fs';
import { SimpleWorkerPool } from './SimpleWorkerPool.js';
import { OptimizedWorkerPool } from '../src/workers/OptimizedWorkerPool.js';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  totalTasks: 100,
  minWorkers: 2,
  maxWorkers: Math.max(2, cpus().length - 1),
  taskComplexity: 1000, // Higher = more CPU-intensive
  warmupRuns: 3,
  benchmarkRuns: 5,
  workerScript: join(__dirname, 'worker-script.js')
};

// Read the worker script file
const workerScript = readFileSync(CONFIG.workerScript, 'utf8');

// Benchmark runner
async function runBenchmark() {
  console.log('Starting worker pool benchmark...');
  console.log('Configuration:', JSON.stringify(CONFIG, null, 2));
  
  // Warm up the JIT
  console.log('\nWarming up...');
  await warmup();
  
  // Run benchmarks
  console.log('\nRunning benchmarks...');
  
  const originalResults = [];
  const optimizedResults = [];
  
  for (let i = 0; i < CONFIG.benchmarkRuns; i++) {
    console.log(`\nRun ${i + 1}/${CONFIG.benchmarkRuns}`);
    
    // Test SimpleWorkerPool
    console.log('  Testing SimpleWorkerPool...');
    const simpleTime = await testWorkerPool(SimpleWorkerPool);
    originalResults.push(simpleTime);
    console.log(`  SimpleWorkerPool: ${simpleTime.toFixed(2)}ms`);
    
    // Test OptimizedWorkerPool
    console.log('  Testing OptimizedWorkerPool...');
    const optimizedTime = await testWorkerPool(OptimizedWorkerPool);
    optimizedResults.push(optimizedTime);
    console.log(`  OptimizedWorkerPool: ${optimizedTime.toFixed(2)}ms`);
    
    // Small delay between runs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calculate and display results
  const avgOriginal = originalResults.reduce((a, b) => a + b, 0) / originalResults.length;
  const avgOptimized = optimizedResults.reduce((a, b) => a + b, 0) / optimizedResults.length;
  const improvement = ((avgOriginal - avgOptimized) / avgOriginal) * 100;
  
  console.log('\n=== Benchmark Results ===');
  console.log(`SimpleWorkerPool (avg): ${avgOriginal.toFixed(2)}ms`);
  console.log(`OptimizedWorkerPool (avg): ${avgOptimized.toFixed(2)}ms`);
  console.log(`Improvement: ${improvement.toFixed(2)}% faster`);
  console.log('========================');
  
  // Detailed results
  console.log('\nDetailed Results:');
  console.log('Run | Original (ms) | Optimized (ms) | Difference (ms) | Improvement (%)');
  console.log('----|---------------|-----------------|------------------|----------------');
  
  for (let i = 0; i < CONFIG.benchmarkRuns; i++) {
    const diff = originalResults[i] - optimizedResults[i];
    const runImprovement = (diff / originalResults[i]) * 100;
    
    console.log(
      `${(i + 1).toString().padEnd(3)} | ${originalResults[i].toFixed(2).padStart(13)} | ${optimizedResults[i].toFixed(2).padStart(15)} | ${diff.toFixed(2).padStart(15)} | ${runImprovement.toFixed(2)}%`
    );
  }
}

// Warm up the JIT
async function warmup() {
  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    process.stdout.write(`  Warmup ${i + 1}/${CONFIG.warmupRuns}... `);
    
    // Create a temporary worker pool for warmup
    const pool = new SimpleWorkerPool(workerScript, {
      minWorkers: 2,
      maxWorkers: 4,
      workerOptions: { eval: true }
    });
    
    // Run a few warmup tasks
    const tasks = [];
    for (let j = 0; j < 10; j++) {
      tasks.push(pool.execute({ n: 100 }));
    }
    
    await Promise.all(tasks);
    await pool.terminate();
    
    console.log('done');
  }
}

// Test a worker pool implementation
async function testWorkerPool(PoolClass) {
  const pool = new PoolClass(workerScript, {
    minWorkers: CONFIG.minWorkers,
    maxWorkers: CONFIG.maxWorkers,
    workerOptions: { eval: true }
  });
  
  // Create tasks
  const tasks = [];
  for (let i = 0; i < CONFIG.totalTasks; i++) {
    tasks.push(
      pool.execute({ 
        n: CONFIG.taskComplexity + (i % 10) // Slight variation in task complexity
      })
    );
  }
  
  // Execute tasks and measure time
  const start = process.hrtime.bigint();
  await Promise.all(tasks);
  const end = process.hrtime.bigint();
  
  // Clean up
  await pool.terminate();
  
  // Return duration in milliseconds
  return Number(end - start) / 1_000_000;
}

// Run the benchmark
runBenchmark().catch(console.error);
