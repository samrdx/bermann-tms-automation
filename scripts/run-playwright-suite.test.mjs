import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPlaywrightTestArgs,
  parseRunPlaywrightSuiteArgs,
  resolveExecutableCommand,
} from './run-playwright-suite.mjs';

test('builds Playwright command with test paths before project flags', () => {
  const parsedArgs = parseRunPlaywrightSuiteArgs([
    '--env',
    'QA',
    '--workers',
    '1',
    '--project',
    'chromium-qa',
    '--path',
    'tests/e2e/modules/ultimamilla/pedido-asignar.test.ts',
  ]);

  assert.equal(parsedArgs.envName, 'QA');
  assert.equal(parsedArgs.workers, '1');
  assert.deepEqual(parsedArgs.projects, ['chromium-qa']);
  assert.deepEqual(parsedArgs.paths, ['tests/e2e/modules/ultimamilla/pedido-asignar.test.ts']);

  assert.deepEqual(buildPlaywrightTestArgs(parsedArgs, { runningInCi: true }), [
    'playwright',
    'test',
    'tests/e2e/modules/ultimamilla/pedido-asignar.test.ts',
    '--trace',
    'retain-on-failure',
    '--workers',
    '1',
    '--project',
    'chromium-qa',
  ]);
});

test('normalizes passthrough positionals ahead of option-value pairs', () => {
  const parsedArgs = parseRunPlaywrightSuiteArgs([
    '--env=DEMO',
    '--setup',
    '--project=chromium-demo',
    'tests/e2e/suites/proforma-crear-e2e.test.ts',
    '--grep',
    'proforma',
    '--reporter=json',
  ]);

  assert.equal(parsedArgs.envName, 'DEMO');
  assert.equal(parsedArgs.runSetupProjects, true);
  assert.deepEqual(parsedArgs.paths, ['tests/e2e/suites/proforma-crear-e2e.test.ts']);
  assert.deepEqual(parsedArgs.passthroughOptions, ['--grep', 'proforma', '--reporter=json']);

  assert.deepEqual(buildPlaywrightTestArgs(parsedArgs, { runningInCi: false }), [
    'playwright',
    'test',
    'tests/e2e/suites/proforma-crear-e2e.test.ts',
    '--headed',
    '--trace',
    'retain-on-failure',
    '--project',
    'chromium-demo',
    '--grep',
    'proforma',
    '--reporter=json',
  ]);
});

test('rejects unsupported environments early', () => {
  assert.throws(
    () => parseRunPlaywrightSuiteArgs(['--env', 'staging']),
    /Invalid --env value: "STAGING"/,
  );
});

test('resolves npx executable without requiring a shell on Windows', () => {
  assert.deepEqual(
    resolveExecutableCommand('npx', ['playwright', 'test'], {
      platform: 'win32',
      npxCliPath: 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js',
    }),
    {
      command: process.execPath,
      commandArgs: ['C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js', 'playwright', 'test'],
    },
  );

  assert.deepEqual(resolveExecutableCommand('npx', ['--version'], { platform: 'linux' }), {
    command: 'npx',
    commandArgs: ['--version'],
  });

  assert.deepEqual(resolveExecutableCommand('node', ['--version'], { platform: 'win32' }), {
    command: 'node',
    commandArgs: ['--version'],
  });
});

test('fails clearly when Windows npx shell-free execution cannot be resolved', () => {
  assert.throws(
    () => resolveExecutableCommand('npx', ['playwright'], {
      platform: 'win32',
      npxCliPath: null,
      env: { npm_execpath: '' },
    }),
    /Unable to locate npx-cli\.js/,
  );
});
