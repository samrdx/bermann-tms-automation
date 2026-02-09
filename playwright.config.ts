import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/examples/**'],  // Explicitly ignore examples directory
  fullyParallel: true,  // Enable parallel execution
  workers: 3,           // One worker per browser for controlled parallelism
  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'  // Never auto-open in CI (prevents hanging in headless)
    }],
    ['json', {
      outputFile: 'playwright-report/results.json'
    }],
    ['list']  // Console output for CI logs
  ],
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
    // Auth tests - run WITHOUT storageState (test login from scratch)
    {
      name: 'auth-tests',
      testMatch: /tests\/e2e\/auth\/.+\.test\.ts/,
      use: devices['Desktop Chrome'],
      // NO storageState - these tests need to test login from scratch
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
    // Browser test projects (with base-entities dependency for CI)
    {
      name: 'chromium',
      testMatch: [
        /tests\/e2e\/modules\/.+\.test\.ts/,  // Only operational tests (modules)
        /tests\/e2e\/suites\/.+\.test\.ts/,   // And suite tests (if any)
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],  // Auth only — base-entities runs as separate CI step
    },
    {
      name: 'firefox',
      testMatch: [
        /tests\/e2e\/modules\/.+\.test\.ts/,  // Only operational tests (modules)
        /tests\/e2e\/suites\/.+\.test\.ts/,   // And suite tests (if any)
      ],
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],  // Auth only — base-entities runs as separate CI step
    },
    {
      name: 'webkit',
      testMatch: [
        /tests\/e2e\/modules\/.+\.test\.ts/,  // Only operational tests (modules)
        /tests\/e2e\/suites\/.+\.test\.ts/,   // And suite tests (if any)
      ],
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],  // Auth only — base-entities runs as separate CI step
    },
  ],
});
