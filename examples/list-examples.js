#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const examplesDir = path.join(__dirname, 'examples');

// Check if examples directory exists
if (!fs.existsSync(examplesDir)) {
  console.log('No examples found. Please build the project first.');
  process.exit(0);
}

// Get all categories
try {
  const categories = fs.readdirSync(examplesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const categoryPath = path.join(examplesDir, dirent.name);
      const examples = fs.readdirSync(categoryPath, { withFileTypes: true })
        .filter(example => example.isDirectory())
        .map(example => ({
          name: example.name,
          path: path.join('examples', dirent.name, example.name, 'index.html')
        }));
      
      return {
        name: dirent.name,
        examples
      };
    });

  // Display the examples in a nice format
  console.log('\nAvailable examples by category:');
  console.log('='.repeat(50));
  
  categories.forEach(category => {
    console.log(`\n${category.name.toUpperCase()}:`);
    console.log('-'.repeat(category.name.length + 1));
    
    if (category.examples.length === 0) {
      console.log('  No examples in this category');
      return;
    }
    
    category.examples.forEach(example => {
      console.log(`  • ${example.name.padEnd(20)} http://localhost:3000/${example.path}`);
    });
  });
  
  console.log('\nTo run a specific example, open the URL in your browser.');
  console.log('To view all examples in the web interface, visit http://localhost:3000');
  
} catch (error) {
  console.error('Error listing examples:', error.message);
  process.exit(1);
}
