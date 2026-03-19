import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

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

  if (arg === '--env') {
    envName = (args[i + 1] ?? 'QA').toUpperCase();
    i += 1;
    continue;
  }

  if (arg.startsWith('--env=')) {
    envName = arg.split('=')[1].toUpperCase();
    continue;
  }

  if (arg === '--path') {
    paths.push(args[i + 1]);
    i += 1;
    continue;
  }

  if (arg.startsWith('--path=')) {
    paths.push(arg.split('=')[1]);
    continue;
  }

  if (arg === '--project') {
    projects.push(args[i + 1]);
    i += 1;
    continue;
  }

  if (arg.startsWith('--project=')) {
    projects.push(arg.split('=')[1]);
    continue;
  }

  if (arg === '--workers') {
    workers = args[i + 1];
    i += 1;
    continue;
  }

  if (arg.startsWith('--workers=')) {
    workers = arg.split('=')[1];
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
  console.error(`[run-playwright-suite] Invalid --env value: "${envName}". Use QA or DEMO.`);
  process.exit(1);
}

const envNameLower = envName.toLowerCase();
const testResultsDir = `test-results-${envNameLower}`;
const playwrightReportDir = `playwright-report-${envNameLower}`;
const allureResultsDir = `allure-results-${envNameLower}`;
const allureReportDir = `allure-report-${envNameLower}`;

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

cleanDir(testResultsDir);
cleanDir(playwrightReportDir);
cleanDir(allureResultsDir);
cleanDir(allureReportDir);

const testArgs = ['playwright', 'test', '--trace', 'on'];
const runningInCi = String(process.env.CI || '').toLowerCase() === 'true';

if (!runningInCi) {
  testArgs.push('--headed');
}

if (workers) {
  testArgs.push('--workers', workers);
}

if (noDeps) {
  testArgs.push('--no-deps');
}

for (const project of projects) {
  testArgs.push('--project', project);
}

for (const targetPath of paths) {
  testArgs.push(targetPath);
}

if (passthrough.length > 0) {
  testArgs.push(...passthrough);
}

const testStatus = run('npx', testArgs, {
  ENV: envName,
  HEADLESS: runningInCi ? 'true' : 'false',
  TRACE_MODE: 'on',
  RUN_SETUP_PROJECTS: runSetupProjects ? 'true' : 'false',
});

let allureGenerateStatus = 0;
if (existsSync(allureResultsDir)) {
  allureGenerateStatus = run('npx', ['allure', 'generate', allureResultsDir, '-o', allureReportDir, '--clean']);
} else {
  console.warn(`[run-playwright-suite] Missing ${allureResultsDir}. Skipping Allure generation.`);
}

if (openReport && allureGenerateStatus === 0 && existsSync(allureReportDir)) {
  run('npx', ['allure', 'open', allureReportDir]);
}

if (testStatus !== 0) {
  process.exit(testStatus);
}

if (allureGenerateStatus !== 0) {
  process.exit(allureGenerateStatus);
}
