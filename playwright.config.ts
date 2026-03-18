import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  buildPlaywrightRuntime,
  getMainProjectNames,
  getProjectDependencies,
  PROJECT_NAMES,
  resolveRunSetupProjects,
} from './src/config/playwright-orchestration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const runtime = buildPlaywrightRuntime(process.env);
const mainProjects = getMainProjectNames(runtime.envName);
const dependencies = getProjectDependencies(runtime.envName);
const includeSetupProjects = resolveRunSetupProjects(process.env.RUN_SETUP_PROJECTS);

export default defineConfig({
  testDir: './tests',
  outputDir: runtime.output.testResultsDir,
  testIgnore: ['**/examples/**'],
  fullyParallel: false,
  workers: runtime.workers,
  retries: runtime.retries,

  reporter: [
    [
      'html',
      {
        outputFolder: runtime.output.htmlReportDir,
        open: 'never',
      },
    ],
    [
      'json',
      {
        outputFile: `${runtime.output.htmlReportDir}/results.json`,
      },
    ],
    [
      'allure-playwright',
      {
        detail: true,
        resultsDir: runtime.output.allureResultsDir,
        suiteTitle: false,
      },
    ],
    ['list'],
  ],

  timeout: runtime.timeoutMs,
  expect: {
    timeout: runtime.expectTimeoutMs,
    toPass: {
      timeout: runtime.toPassTimeoutMs,
      intervals: runtime.toPassIntervals,
    },
  },

  use: {
    baseURL: runtime.baseURL,
    headless: runtime.headless,
    viewport: { width: 1920, height: 1080 },
    actionTimeout: runtime.actionTimeoutMs,
    navigationTimeout: runtime.navigationTimeoutMs,
    trace: runtime.trace,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  tsconfig: './tsconfig.tests.json',

  projects: [
    {
      name: PROJECT_NAMES.AUTH_SETUP,
      testMatch: /auth\.setup\.ts/,
    },

    ...(includeSetupProjects
      ? [
          {
            name: PROJECT_NAMES.CONFIG_SMOKE_CHROMIUM,
            testMatch: 'e2e/modules/00-config/config/**/*.test.ts',
            use: {
              ...devices['Desktop Chrome'],
              storageState: runtime.output.storageStatePath,
            },
            dependencies: dependencies[PROJECT_NAMES.CONFIG_SMOKE_CHROMIUM],
          },
          {
            name: PROJECT_NAMES.CONFIG_SMOKE_FIREFOX,
            testMatch: 'e2e/modules/00-config/config/**/*.test.ts',
            use: {
              ...devices['Desktop Firefox'],
              storageState: runtime.output.storageStatePath,
            },
            dependencies: dependencies[PROJECT_NAMES.CONFIG_SMOKE_FIREFOX],
          },
          {
            name: PROJECT_NAMES.CONFIG_PHASE1_CHROMIUM,
            testMatch: 'e2e/suites/01-config-master.setup.ts',
            use: {
              ...devices['Desktop Chrome'],
              storageState: runtime.output.storageStatePath,
            },
            dependencies: dependencies[PROJECT_NAMES.CONFIG_PHASE1_CHROMIUM],
          },
          {
            name: PROJECT_NAMES.CONFIG_PHASE1_FIREFOX,
            testMatch: 'e2e/suites/01-config-master.setup.ts',
            use: {
              ...devices['Desktop Firefox'],
              storageState: runtime.output.storageStatePath,
            },
            dependencies: dependencies[PROJECT_NAMES.CONFIG_PHASE1_FIREFOX],
          },
          {
            name: PROJECT_NAMES.CONFIG_PHASE2_CHROMIUM,
            testMatch: 'e2e/suites/02-carga-master.setup.ts',
            use: {
              ...devices['Desktop Chrome'],
              storageState: runtime.output.storageStatePath,
            },
            dependencies: dependencies[PROJECT_NAMES.CONFIG_PHASE2_CHROMIUM],
          },
          {
            name: PROJECT_NAMES.CONFIG_PHASE2_FIREFOX,
            testMatch: 'e2e/suites/02-carga-master.setup.ts',
            use: {
              ...devices['Desktop Firefox'],
              storageState: runtime.output.storageStatePath,
            },
            dependencies: dependencies[PROJECT_NAMES.CONFIG_PHASE2_FIREFOX],
          },
          {
            name: PROJECT_NAMES.BASE_ENTITIES_CHROMIUM,
            testMatch: 'e2e/suites/base-entities.setup.ts',
            use: devices['Desktop Chrome'],
            dependencies: dependencies[PROJECT_NAMES.BASE_ENTITIES_CHROMIUM],
          },
          {
            name: PROJECT_NAMES.BASE_ENTITIES_FIREFOX,
            testMatch: 'e2e/suites/base-entities.setup.ts',
            use: devices['Desktop Firefox'],
            dependencies: dependencies[PROJECT_NAMES.BASE_ENTITIES_FIREFOX],
          },
        ]
      : []),

    {
      name: PROJECT_NAMES.AUTH_TESTS,
      testMatch: 'e2e/auth/**/*.test.ts',
      use: devices['Desktop Chrome'],
    },

    {
      name: mainProjects.chromium,
      testMatch: ['e2e/modules/**/*.test.ts', 'e2e/suites/**/*.test.ts'],
      testIgnore: ['**/suites/*.setup.ts', '**/modules/00-config/config/**'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: runtime.output.storageStatePath,
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox'],
        },
      },
      dependencies: dependencies[mainProjects.chromium],
    },
    {
      name: mainProjects.firefox,
      testMatch: ['e2e/modules/**/*.test.ts', 'e2e/suites/**/*.test.ts'],
      testIgnore: ['**/suites/*.setup.ts', '**/modules/00-config/config/**'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: runtime.output.storageStatePath,
      },
      dependencies: dependencies[mainProjects.firefox],
    },
  ],
});
