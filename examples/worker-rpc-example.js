/**
 * Worker RPC Example
 * Demonstrates how to use the Worker RPC utility for structured communication with workers
 */

import { createWorkerRPC, createRPCHandler } from '../src/workers/workerRPC.js';

// Define the API that will be available in the worker
const calculatorAPI = {
  // Simple methods
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
  },
  
  // Async method
  delayedResult: async (value, delay) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return `Result after ${delay}ms: ${value}`;
  },
  
  // Nested methods
  math: {
    sqrt: (x) => Math.sqrt(x),
    pow: (x, y) => Math.pow(x, y),
    random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
  },
  
  // Method with transferable objects (for browser)
  processImage: (imageData) => {
    // In a real app, this would process the image
    const processed = new Uint8ClampedArray(imageData);
    // Simple invert colors as an example
    for (let i = 0; i < processed.length; i += 4) {
      processed[i] = 255 - processed[i];         // R
      processed[i + 1] = 255 - processed[i + 1]; // G
      processed[i + 2] = 255 - processed[i + 2]; // B
      // Alpha channel remains the same
    }
    return processed;
  }
};

// Main function to run the example
async function main() {
  console.log('Starting Worker RPC example...');
  
  try {
    // Create an RPC worker with our API
    const workerScript = createRPCHandler(calculatorAPI);
    const rpc = createWorkerRPC(workerScript, {
      minWorkers: 1,
      maxWorkers: 2,
      timeout: 10000, // 10 second timeout for RPC calls
    });
    
    console.log('Worker RPC interface created');
    
    // Test simple method calls
    console.log('\n--- Testing Basic Math ---');
    console.log('2 + 3 =', await rpc.add(2, 3));
    console.log('10 - 4 =', await rpc.subtract(10, 4));
    console.log('5 * 6 =', await rpc.multiply(5, 6));
    console.log('20 / 4 =', await rpc.divide(20, 4));
    
    // Test nested methods
    console.log('\n--- Testing Nested Methods ---');
    console.log('sqrt(16) =', await rpc.math.sqrt(16));
    console.log('2^10 =', await rpc.math.pow(2, 10));
    console.log('Random number between 1-100:', await rpc.math.random(1, 100));
    
    // Test async method
    console.log('\n--- Testing Async Method ---');
    console.log('Waiting for delayed result...');
    const delayed = await rpc.delayedResult('Hello, RPC!', 1000);
    console.log(delayed);
    
    // Test error handling
    console.log('\n--- Testing Error Handling ---');
    try {
      await rpc.divide(10, 0);
    } catch (error) {
      console.log('Caught error:', error.message);
    }
    
    // Test with transferable objects (browser only)
    if (typeof window !== 'undefined' && window.Uint8ClampedArray) {
      console.log('\n--- Testing Image Processing (with transferables) ---');
      // Create a sample image (4 bytes per pixel: RGBA)
      const width = 4, height = 4;
      const imageData = new Uint8ClampedArray(width * height * 4);
      
      // Fill with a gradient
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          imageData[i] = x * (255 / (width - 1));     // R
          imageData[i + 1] = y * (255 / (height - 1)); // G
          imageData[i + 2] = 128;                     // B
          imageData[i + 3] = 255;                     // A
        }
      }
      
      console.log('Original pixel data (first 4 pixels):', 
        Array.from(imageData.slice(0, 16)));
      
      // Process the image in the worker
      const processed = await rpc.processImage(
        imageData.buffer, 
        [imageData.buffer] // Transfer the buffer to the worker
      );
      
      console.log('Processed pixel data (first 4 pixels):', 
        Array.from(new Uint8ClampedArray(processed).slice(0, 16)));
    }
    
    // Clean up
    await rpc.terminate();
    console.log('\nWorker RPC interface terminated');
    
  } catch (error) {
    console.error('Error in Worker RPC example:', error);
  }
}

// Run the example
main().catch(console.error);
