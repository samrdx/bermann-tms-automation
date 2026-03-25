import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPlaywrightTestArgs,
  parseRunPlaywrightSuiteArgs,
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
    'on',
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
    '--project=firefox-demo',
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
    'on',
    '--project',
    'firefox-demo',
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
