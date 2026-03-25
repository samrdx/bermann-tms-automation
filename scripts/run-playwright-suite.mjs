import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLAYWRIGHT_BOOLEAN_OPTIONS = new Set([
  '--debug',
  '--fail-on-flaky-tests',
  '--forbid-only',
  '--fully-parallel',
  '--headed',
  '--help',
  '--list',
  '--no-deps',
  '--pass-with-no-tests',
  '--quiet',
  '--ui',
  '-h',
  '-x',
]);

function takeInlineOrNextValue(args, index, flagName) {
  const arg = args[index];

  if (arg.includes('=')) {
    return {
      value: arg.slice(arg.indexOf('=') + 1),
      nextIndex: index,
    };
  }

  const value = args[index + 1];

  if (value == null) {
    throw new Error(`[run-playwright-suite] Missing value for ${flagName}.`);
  }

  return {
    value,
    nextIndex: index + 1,
  };
}

function normalizePassthroughArgs(args) {
  const positional = [];
  const options = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--') {
      positional.push(...args.slice(i + 1));
      break;
    }

    if (!arg.startsWith('-')) {
      positional.push(arg);
      continue;
    }

    options.push(arg);

    const nextArg = args[i + 1];
    const isInlineValue = arg.includes('=');
    const isBooleanOption = PLAYWRIGHT_BOOLEAN_OPTIONS.has(arg);

    if (!isInlineValue && !isBooleanOption && nextArg != null && !nextArg.startsWith('-')) {
      options.push(nextArg);
      i += 1;
    }
  }

  return { positional, options };
}

export function parseRunPlaywrightSuiteArgs(args) {
  let envName = 'QA';
  let workers;
  let runSetupProjects = false;
  let noDeps = false;
  let openReport = false;
  const paths = [];
  const projects = [];
  const passthrough = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--') {
      passthrough.push(...args.slice(i + 1));
      break;
    }

    if (arg === '--env' || arg.startsWith('--env=')) {
      const result = takeInlineOrNextValue(args, i, '--env');
      envName = result.value.toUpperCase();
      i = result.nextIndex;
      continue;
    }

    if (arg === '--path' || arg.startsWith('--path=')) {
      const result = takeInlineOrNextValue(args, i, '--path');
      paths.push(result.value);
      i = result.nextIndex;
      continue;
    }

    if (arg === '--project' || arg.startsWith('--project=')) {
      const result = takeInlineOrNextValue(args, i, '--project');
      projects.push(result.value);
      i = result.nextIndex;
      continue;
    }

    if (arg === '--workers' || arg.startsWith('--workers=')) {
      const result = takeInlineOrNextValue(args, i, '--workers');
      workers = result.value;
      i = result.nextIndex;
      continue;
    }

    if (arg === '--setup') {
      runSetupProjects = true;
      continue;
    }

    if (arg === '--no-deps') {
      noDeps = true;
      continue;
    }

    if (arg === '--open-report') {
      openReport = true;
      continue;
    }

    passthrough.push(arg);
  }

  if (envName !== 'QA' && envName !== 'DEMO') {
    throw new Error(`[run-playwright-suite] Invalid --env value: "${envName}". Use QA or DEMO.`);
  }

  const passthroughArgs = normalizePassthroughArgs(passthrough);

  return {
    envName,
    workers,
    runSetupProjects,
    noDeps,
    openReport,
    paths: [...paths, ...passthroughArgs.positional],
    projects,
    passthroughOptions: passthroughArgs.options,
  };
}

export function buildPlaywrightTestArgs(parsedArgs, { runningInCi } = {}) {
  const testArgs = ['playwright', 'test', ...parsedArgs.paths];

  if (!runningInCi) {
    testArgs.push('--headed');
  }

  testArgs.push('--trace', 'on');

  if (parsedArgs.workers) {
    testArgs.push('--workers', parsedArgs.workers);
  }

  if (parsedArgs.noDeps) {
    testArgs.push('--no-deps');
  }

  for (const project of parsedArgs.projects) {
    testArgs.push('--project', project);
  }

  if (parsedArgs.passthroughOptions.length > 0) {
    testArgs.push(...parsedArgs.passthroughOptions);
  }

  return testArgs;
}

function getReportDirectories(envName) {
  const envNameLower = envName.toLowerCase();

  return {
    testResultsDir: `test-results-${envNameLower}`,
    playwrightReportDir: `playwright-report-${envNameLower}`,
    allureResultsDir: `allure-results-${envNameLower}`,
    allureReportDir: `allure-report-${envNameLower}`,
  };
}

function run(command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function cleanDir(targetPath) {
  rmSync(targetPath, { recursive: true, force: true });
}

export function runPlaywrightSuite(args, { runCommand = run } = {}) {
  const parsedArgs = parseRunPlaywrightSuiteArgs(args);
  const directories = getReportDirectories(parsedArgs.envName);

  cleanDir(directories.testResultsDir);
  cleanDir(directories.playwrightReportDir);
  cleanDir(directories.allureResultsDir);
  cleanDir(directories.allureReportDir);

  const runningInCi = String(process.env.CI || '').toLowerCase() === 'true';
  const testArgs = buildPlaywrightTestArgs(parsedArgs, { runningInCi });

  const testStatus = runCommand('npx', testArgs, {
    ENV: parsedArgs.envName,
    HEADLESS: runningInCi ? 'true' : 'false',
    TRACE_MODE: 'on',
    RUN_SETUP_PROJECTS: parsedArgs.runSetupProjects ? 'true' : 'false',
  });

  let allureGenerateStatus = 0;
  if (existsSync(directories.allureResultsDir)) {
    allureGenerateStatus = runCommand('npx', ['allure', 'generate', directories.allureResultsDir, '-o', directories.allureReportDir, '--clean']);
  } else {
    console.warn(`[run-playwright-suite] Missing ${directories.allureResultsDir}. Skipping Allure generation.`);
  }

  if (parsedArgs.openReport && allureGenerateStatus === 0 && existsSync(directories.allureReportDir)) {
    runCommand('npx', ['allure', 'open', directories.allureReportDir]);
  }

  if (testStatus !== 0) {
    return testStatus;
  }

  if (allureGenerateStatus !== 0) {
    return allureGenerateStatus;
  }

  return 0;
}

function isEntrypoint() {
  return process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isEntrypoint()) {
  try {
    process.exit(runPlaywrightSuite(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
