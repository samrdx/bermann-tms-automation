import { defineConfig } from '@playwright/test';

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
  tsconfig: './tsconfig.tests.json'
});
