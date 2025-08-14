import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

// Test configuration
const TEST_PORT = 3001;
const TEST_URL = `http://localhost:${TEST_PORT}`;

// Test suite for the WebSocket chat application
test.describe('WebSocket Chat Application - Minimal Test', () => {
  let serverProcess;
  
  // Start the server before all tests
  test.beforeAll(async () => {
    console.log('Starting test server...');
    
    return new Promise((resolve, reject) => {
      // Start the server as a child process
      serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: TEST_PORT.toString() },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Log server output
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[Server] ${output}`);
        
        // Check if server is ready
        if (output.includes('Server running on port')) {
          console.log('Server is ready!');
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data}`);
      });

      // Handle process exit
      serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (code !== 0) {
          reject(new Error(`Server process exited with code ${code}`));
        }
      });

      // Set a timeout for server startup
      setTimeout(() => {
        if (serverProcess.exitCode === null) {
          reject(new Error('Server did not start within 10 seconds'));
        }
      }, 10000);
    });
  });

  // Stop the server after all tests
  test.afterAll(async () => {
    if (serverProcess) {
      console.log('Stopping test server...');
      serverProcess.kill();
    }
  });

  // Minimal test to verify the application loads
  test('should load the chat application', async ({ page }) => {
    console.log('Navigating to chat application...');
    
    // Navigate to the chat application
    const response = await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    expect(response.status()).toBe(200);
    
    // Check the page title
    await expect(page).toHaveTitle('WebSocket Chat');
    
    // Check if the chat container is visible
    await expect(page.locator('.chat-container')).toBeVisible();
    
    console.log('Chat application loaded successfully');
  });

  // Test if the username modal appears
  test('should show username modal for new users', async ({ page }) => {
    console.log('Testing username modal...');
    
    // Navigate to the chat application
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    
    // Check if the username modal is visible
    const isModalVisible = await page.evaluate(() => {
      const modal = document.getElementById('usernameModal');
      if (!modal) return false;
      
      const style = window.getComputedStyle(modal);
      return style && style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    console.log('Is username modal visible?', isModalVisible);
    
    // If modal is not visible, check if it's because a username is already set
    if (!isModalVisible) {
      const currentUsername = await page.evaluate(() => {
        const display = document.getElementById('usernameDisplay');
        return display ? display.textContent.trim() : null;
      });
      
      console.log('Current username:', currentUsername);
      
      // If no username is set but modal is not visible, this is an error
      if (!currentUsername || currentUsername.includes('User')) {
        throw new Error('Username modal should be visible for new users');
      }
    }
    
    console.log('Username modal test completed');
  });
});
