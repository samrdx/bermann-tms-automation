import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  use: {
    headless: false,
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  tsconfig: './tsconfig.tests.json',
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'], // REMOVED: Tests now run in isolation with explicit login
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'], // REMOVED: Tests now run in isolation with explicit login
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'], // REMOVED: Tests now run in isolation with explicit login
    },
  ],
});
