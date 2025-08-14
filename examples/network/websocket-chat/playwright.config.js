// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const SERVER_URL = `http://localhost:${PORT}`;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Timeout for each test
  timeout: 60 * 1000, // 60 seconds
  
  // Expect timeout
  expect: {
    timeout: 10 * 1000, // 10 seconds
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['list'],
    ['dot']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: SERVER_URL,
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'on-first-retry',
    
    // Navigation timeout
    navigationTimeout: 30 * 1000, // 30 seconds
    
    // Action timeout
    actionTimeout: 10 * 1000, // 10 seconds
    
    // Test ID attribute
    testIdAttribute: 'data-testid',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          slowMo: 100, // Slow down by 100ms for each action
        },
      },
    },
    // Uncomment to test in other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Using a manually started server for testing
  // No webServer configuration needed as we're starting the server manually
  
  // Output directory for test artifacts
  outputDir: 'test-results/playwright',
});
