import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/examples/**'],  // Explicitly ignore examples directory
  fullyParallel: true,  // Enable parallel execution
  workers: 3,           // One worker per browser for controlled parallelism
  timeout: 60000,
  retries: 0,
  use: {
    headless: process.env.CI ? true : (process.env.HEADLESS === 'true'),  // Auto-headless in CI
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  tsconfig: './tsconfig.tests.json',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,  // Only auth setup
    },
    // Separate base-entities setup for each browser (worker isolation)
    {
      name: 'base-entities-chromium',
      testMatch: /base-entities\.setup\.ts/,
      use: devices['Desktop Chrome'],
      dependencies: ['setup'],
    },
    {
      name: 'base-entities-firefox',
      testMatch: /base-entities\.setup\.ts/,
      use: devices['Desktop Firefox'],
      dependencies: ['setup'],
    },
    {
      name: 'base-entities-webkit',
      testMatch: /base-entities\.setup\.ts/,
      use: devices['Desktop Safari'],
      dependencies: ['setup'],
    },
    // Browser test projects
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup', 'base-entities-chromium'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup', 'base-entities-firefox'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup', 'base-entities-webkit'],
    },
  ],
});
