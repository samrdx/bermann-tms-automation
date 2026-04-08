import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RUN_LOCK_TIMEOUT_MS = 120_000;
const RUN_LOCK_STALE_MS = 10 * 60_000;
const RUN_LOCK_POLL_MS = 500;

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

  // Keep trace artifacts only on failing tests to avoid artifact temp-dir churn.
  testArgs.push('--trace', 'retain-on-failure');

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

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function parseLockPid(lockPath) {
  try {
    const fileContents = readFileSync(lockPath, 'utf8');
    const lockInfo = JSON.parse(fileContents);
    return Number.isInteger(lockInfo?.pid) ? lockInfo.pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') {
      return true;
    }

    return false;
  }
}

function tryRemoveLock(lockPath) {
  try {
    unlinkSync(lockPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function acquireRunLock(envName) {
  const envNameLower = envName.toLowerCase();
  const tempDir = join(process.cwd(), '.tmp');
  const lockPath = join(tempDir, `pw-run-${envNameLower}.lock`);
  const startTime = Date.now();
  let hasLoggedWaiting = false;

  mkdirSync(tempDir, { recursive: true });

  while (true) {
    try {
      const lockFd = openSync(lockPath, 'wx');
      closeSync(lockFd);
      writeFileSync(lockPath, `${JSON.stringify({ pid: process.pid, env: envName, acquiredAt: new Date().toISOString() })}\n`);
      console.info(`[run-playwright-suite] Lock acquired for env ${envName} at ${lockPath}.`);
      return { lockPath, envName };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }

      if (!hasLoggedWaiting) {
        hasLoggedWaiting = true;
        console.info(`[run-playwright-suite] Waiting for env ${envName} lock at ${lockPath}.`);
      }

      const lockPid = parseLockPid(lockPath);
      if (lockPid != null && !isProcessAlive(lockPid)) {
        console.warn(`[run-playwright-suite] Removing orphan env ${envName} lock from dead pid ${lockPid} at ${lockPath}.`);
        tryRemoveLock(lockPath);
        continue;
      }

      try {
        const lockStat = statSync(lockPath);
        const lockAgeMs = Date.now() - lockStat.mtimeMs;

        if (lockAgeMs > RUN_LOCK_STALE_MS) {
          console.warn(`[run-playwright-suite] Removing stale env ${envName} lock (${Math.round(lockAgeMs)}ms) at ${lockPath}.`);
          tryRemoveLock(lockPath);
          continue;
        }
      } catch (statError) {
        if (statError?.code === 'ENOENT') {
          continue;
        }

        throw statError;
      }

      if (Date.now() - startTime >= RUN_LOCK_TIMEOUT_MS) {
        throw new Error(`[run-playwright-suite] Timeout waiting ${RUN_LOCK_TIMEOUT_MS}ms for env ${envName} lock at ${lockPath}.`);
      }

      sleep(RUN_LOCK_POLL_MS);
    }
  }
}

function releaseRunLock(lockInfo) {
  try {
    unlinkSync(lockInfo.lockPath);
    console.info(`[run-playwright-suite] Lock released for env ${lockInfo.envName} at ${lockInfo.lockPath}.`);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.warn(`[run-playwright-suite] Lock already released for env ${lockInfo.envName} at ${lockInfo.lockPath}.`);
      return;
    }

    throw error;
  }
}

export function runPlaywrightSuite(args, { runCommand = run } = {}) {
  const parsedArgs = parseRunPlaywrightSuiteArgs(args);
  const lockInfo = acquireRunLock(parsedArgs.envName);

  try {
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
      TRACE_MODE: 'retain-on-failure',
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
  } finally {
    releaseRunLock(lockInfo);
  }
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
