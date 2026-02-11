import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url'; // 1. Importar esto

// 2. Reconstruir __filename y __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/examples/**'],
  fullyParallel: true,

  /* * CRÍTICO PARA CI:
   * - En CI usamos 1 worker para evitar colisiones en la DB legacy.
   * - En Local usamos 3 para velocidad.
   */
  workers: process.env.CI ? 1 : 3,

  /*
   * RETRIES:
   * - En CI reintentamos 2 veces si falla (para flakiness de red/UI).
   * - En Local 0 para ver el fallo rápido.
   */
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }],
    ['json', {
      outputFile: 'playwright-report/results.json'
    }],
    ['list']
  ],

  /*
   * TIMEOUTS (Optimizados para CI lento):
   * - Global: 3 min en CI (entidades + contratos + viaje).
   * - Expect/Action: 20s en CI (spinners de carga y cascades AJAX).
   */
  timeout: process.env.CI ? 180 * 1000 : 60 * 1000,
  expect: {
    timeout: process.env.CI ? 20 * 1000 : 10 * 1000,
    toPass: {
      timeout: process.env.CI ? 30 * 1000 : 15 * 1000,
      intervals: [500, 1000, 2000, 5000],
    },
  },

  use: {
    /* Headless: True en CI, o lo que diga la variable en local */
    headless: process.env.CI ? true : (process.env.HEADLESS === 'true'),

    /* Viewport reducido para mejor visualización en headed mode */
    viewport: { width: 1024, height: 768 },

    /* Tamaño de ventana para headed mode (se ve centrado en pantalla) */
    launchOptions: {
      args: process.env.HEADLESS === 'false' ? ['--window-size=1100,850'] : []
    },

    actionTimeout: process.env.CI ? 20 * 1000 : 10 * 1000,
    navigationTimeout: process.env.CI ? 45 * 1000 : 20 * 1000,

    /* Artifacts: Solo guardamos evidencia si falla */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    ignoreHTTPSErrors: true,
  },

  tsconfig: './tsconfig.tests.json',

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'auth-tests',
      testMatch: /tests\/e2e\/auth\/.+\.test\.ts/,
      use: devices['Desktop Chrome'],
    },
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

    // --- MAIN TEST PROJECTS ---
    {
      name: 'chromium',
      testMatch: [
        /tests\/e2e\/modules\/.+\.test\.ts/,
        /tests\/e2e\/suites\/.+\.test\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox']
        }
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testMatch: [
        /tests\/e2e\/modules\/.+\.test\.ts/,
        /tests\/e2e\/suites\/.+\.test\.ts/,
      ],
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testMatch: [
        /tests\/e2e\/modules\/.+\.test\.ts/,
        /tests\/e2e\/suites\/.+\.test\.ts/,
      ],
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});