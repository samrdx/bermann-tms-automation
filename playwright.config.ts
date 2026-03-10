import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Reconstruir __filename y __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

const ENV = process.env.ENV || 'QA';
const envName = ENV.toLowerCase();
const baseURL = ENV === 'DEMO'
  ? 'https://demo.bermanntms.cl'
  : 'https://moveontruckqa.bermanntms.cl';

export default defineConfig({
  testDir: './tests',
  outputDir: `test-results-${envName}`,
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
      outputFolder: `playwright-report-${ENV.toLowerCase()}`,
      open: 'never'
    }],
    ['json', {
      outputFile: `playwright-report-${ENV.toLowerCase()}/results.json`
    }],
    ['allure-playwright', {
      detail: true,
      resultsDir: `allure-results-${ENV.toLowerCase()}`,
      suiteTitle: false
    }],
    ['list']
  ],

  /*
   * TIMEOUTS (Optimizados para CI lento):
   * - Global: 3 min en CI.
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
    baseURL,
    /* Headless: True en CI, o lo que diga la variable en local */
    headless: process.env.CI ? true : (process.env.HEADLESS === 'true'),

    /* * CORRECCIÓN DE PANTALLA:
     * Usamos 1920x1080 para evitar que footers o menús responsivos tapen botones.
     * Esto reemplaza el hack de --window-size que rompía Firefox.
     */
    viewport: { width: 1920, height: 1080 },

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
    // --- SETUP PROJECTS ---
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // --- SEEDING PROJECTS (Run before main tests that consume their data) ---
    {
      name: `seed-transportista-chromium`,
      testMatch: 'e2e/modules/01-entidades/transport/transportistas-crear.test.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: `playwright/.auth/user-${envName}.json`, // Use the authentication state
      },
      dependencies: ['setup'],
    },
    {
      name: `seed-transportista-firefox`,
      testMatch: 'e2e/modules/01-entidades/transport/transportistas-crear.test.ts',
      use: {
        ...devices['Desktop Firefox'],
        storageState: `playwright/.auth/user-${envName}.json`, // Use the authentication state
      },
      dependencies: ['setup'],
    },

    // --- AUTH UTILS ---
    {
      name: 'auth-tests',
      testMatch: 'e2e/auth/**/*.test.ts',
      use: devices['Desktop Chrome'],
    },

    // --- BASE ENTITIES SETUP ---
    {
      name: 'base-entities-chromium',
      testMatch: 'e2e/suites/base-entities.setup.ts',
      use: devices['Desktop Chrome'],
      dependencies: ['setup'],
    },
    {
      name: 'base-entities-firefox',
      testMatch: 'e2e/suites/base-entities.setup.ts',
      use: devices['Desktop Firefox'],
      dependencies: ['setup'],
    },
    // 🗑️ WEBKIT ELIMINADO POR INESTABILIDAD
    // {
    //   name: 'base-entities-webkit',
    //   testMatch: 'e2e/suites/base-entities.setup.ts',
    //   use: devices['Desktop Safari'],
    //   dependencies: ['setup'],
    // },

    // --- MAIN TEST PROJECTS ---
    {
      name: `chromium-${envName}`,
      testMatch: [
        'e2e/modules/**/*.test.ts',
        'e2e/suites/**/*.test.ts',
      ],
      testIgnore: ['**/transportistas-crear.test.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `playwright/.auth/user-${envName}.json`,
        // Chrome acepta estos args, pero Firefox no. Aquí sí están bien.
        launchOptions: {
          args: ['--disable-dev-shm-usage', '--no-sandbox']
        }
      },
      dependencies: ['setup'],
    },
    {
      name: `firefox-${envName}`,
      testMatch: [
        'e2e/modules/**/*.test.ts',
        'e2e/suites/**/*.test.ts',
      ],
      testIgnore: ['**/transportistas-crear.test.ts'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: `playwright/.auth/user-${envName}.json`,
        // IMPORTANTE: Sin launchOptions.args que rompan Firefox
      },
      dependencies: ['setup'],
    },

    // 🗑️ WEBKIT ELIMINADO POR INESTABILIDAD EN FORMULARIOS LEGACY
    // Se mantiene comentado para referencia futura o debugging local puntual.
    // {
    //   name: 'webkit',
    //   testMatch: [
    //     'e2e/modules/**/*.test.ts',
    //     'e2e/suites/**/*.test.ts',
    //   ],
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: `playwright/.auth/user-${envName}.json`,
    //   },
    //   dependencies: ['setup'],
    // },
  ],
});