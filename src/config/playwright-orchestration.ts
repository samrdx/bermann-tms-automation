export type SupportedEnvironment = 'QA' | 'DEMO';
export type TraceMode = 'on' | 'off' | 'retain-on-failure' | 'on-first-retry';

export interface PlaywrightRuntime {
  environment: SupportedEnvironment;
  envName: string;
  baseURL: string;
  headless: boolean;
  workers: number;
  retries: number;
  timeoutMs: number;
  expectTimeoutMs: number;
  toPassTimeoutMs: number;
  toPassIntervals: number[];
  actionTimeoutMs: number;
  navigationTimeoutMs: number;
  trace: TraceMode;
  output: {
    testResultsDir: string;
    htmlReportDir: string;
    allureResultsDir: string;
    storageStatePath: string;
  };
}

export interface RuntimeInput {
  ENV?: string;
  CI?: string;
  HEADLESS?: string;
  TRACE_MODE?: string;
  RUN_SETUP_PROJECTS?: string;
  [key: string]: string | undefined;
}

export const PROJECT_NAMES = {
  AUTH_SETUP: 'auth-setup',
  CONFIG_SMOKE_CHROMIUM: 'config-smoke-chromium',
  CONFIG_SMOKE_FIREFOX: 'config-smoke-firefox',
  CONFIG_PHASE1_CHROMIUM: 'config-fase1-chromium',
  CONFIG_PHASE1_FIREFOX: 'config-fase1-firefox',
  CONFIG_PHASE2_CHROMIUM: 'config-fase2-chromium',
  CONFIG_PHASE2_FIREFOX: 'config-fase2-firefox',
  AUTH_TESTS: 'auth-tests',
  BASE_ENTITIES_CHROMIUM: 'base-entities-chromium',
  BASE_ENTITIES_FIREFOX: 'base-entities-firefox',
} as const;

const QA_BASE_URL = 'https://moveontruckqa.bermanntms.cl';
const DEMO_BASE_URL = 'https://demo.bermanntms.cl';

export function resolveEnvironment(rawEnv: string | undefined): SupportedEnvironment {
  return rawEnv?.toUpperCase() === 'DEMO' ? 'DEMO' : 'QA';
}

export function resolveCi(rawCi: string | undefined): boolean {
  return rawCi === 'true' || rawCi === '1';
}

export function resolveHeadless(isCi: boolean, rawHeadless: string | undefined): boolean {
  if (isCi) {
    return true;
  }
  return rawHeadless === 'true';
}

export function resolveTraceMode(rawTraceMode: string | undefined): TraceMode {
  if (rawTraceMode === 'on' || rawTraceMode === 'off' || rawTraceMode === 'retain-on-failure' || rawTraceMode === 'on-first-retry') {
    return rawTraceMode;
  }
  return 'retain-on-failure';
}

export function resolveRunSetupProjects(rawRunSetupProjects: string | undefined): boolean {
  return rawRunSetupProjects === 'true' || rawRunSetupProjects === '1';
}

export function getBaseUrl(environment: SupportedEnvironment): string {
  return environment === 'DEMO' ? DEMO_BASE_URL : QA_BASE_URL;
}

export function getStorageStatePath(environment: SupportedEnvironment): string {
  return `playwright/.auth/user-${environment.toLowerCase()}.json`;
}

export function buildOutputPaths(environment: SupportedEnvironment): PlaywrightRuntime['output'] {
  const envName = environment.toLowerCase();
  return {
    testResultsDir: `test-results-${envName}`,
    htmlReportDir: `playwright-report-${envName}`,
    allureResultsDir: `allure-results-${envName}`,
    storageStatePath: getStorageStatePath(environment),
  };
}

export function getMainProjectNames(envName: string): { chromium: string; firefox: string } {
  return {
    chromium: `chromium-${envName}`,
    firefox: `firefox-${envName}`,
  };
}

export function getProjectDependencies(envName: string): Record<string, string[]> {
  const main = getMainProjectNames(envName);
  return {
    [PROJECT_NAMES.CONFIG_SMOKE_CHROMIUM]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.CONFIG_SMOKE_FIREFOX]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.CONFIG_PHASE1_CHROMIUM]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.CONFIG_PHASE1_FIREFOX]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.CONFIG_PHASE2_CHROMIUM]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.CONFIG_PHASE2_FIREFOX]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.BASE_ENTITIES_CHROMIUM]: [PROJECT_NAMES.AUTH_SETUP],
    [PROJECT_NAMES.BASE_ENTITIES_FIREFOX]: [PROJECT_NAMES.AUTH_SETUP],
    [main.chromium]: [PROJECT_NAMES.AUTH_SETUP],
    [main.firefox]: [PROJECT_NAMES.AUTH_SETUP],
  };
}

export function buildPlaywrightRuntime(input: RuntimeInput = process.env): PlaywrightRuntime {
  const environment = resolveEnvironment(input.ENV);
  const envName = environment.toLowerCase();
  const isCi = resolveCi(input.CI);
  const isDemoOrCi = isCi || environment === 'DEMO';

  return {
    environment,
    envName,
    baseURL: getBaseUrl(environment),
    headless: resolveHeadless(isCi, input.HEADLESS),
    workers: isCi ? 1 : 3,
    retries: isCi ? 2 : 0,
    timeoutMs: isDemoOrCi ? 240 * 1000 : 60 * 1000,
    expectTimeoutMs: isDemoOrCi ? 30 * 1000 : 10 * 1000,
    toPassTimeoutMs: isDemoOrCi ? 45 * 1000 : 15 * 1000,
    toPassIntervals: [500, 1000, 2000, 5000],
    actionTimeoutMs: isDemoOrCi ? 30 * 1000 : 10 * 1000,
    navigationTimeoutMs: isDemoOrCi ? 60 * 1000 : 20 * 1000,
    trace: resolveTraceMode(input.TRACE_MODE),
    output: buildOutputPaths(environment),
  };
}
