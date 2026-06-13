import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const syncScript = join(scriptDir, 'sync-test-set.ps1');
const fixturesDir = join(scriptDir, 'fixtures');

function analyzeFixture(name) {
  const fixtureFile = join(fixturesDir, name);
  const result = spawnSync(
    'PowerShell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      syncScript,
      '-AnalyzeFixture',
      '-FixtureFile',
      fixtureFile,
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('extracts table criteria like TMSPROD-2210', () => {
  const analysis = analyzeFixture('table-criteria-tmsprod-2210.json');

  assert.equal(analysis.RawScenarioCount, 5);
  assert.equal(analysis.ScenarioCount, 5);
  assert.equal(analysis.DuplicateCount, 0);
  assert.equal(analysis.QualityStatus, 'OK');
});

test('extracts and deduplicates Gherkin paragraph/panel criteria like TMSPROD-2200', () => {
  const analysis = analyzeFixture('gherkin-panel-tmsprod-2200.json');

  assert.equal(analysis.RawScenarioCount, 11);
  assert.equal(analysis.ScenarioCount, 10);
  assert.equal(analysis.RawDuplicateCount, 1);
  assert.equal(analysis.DuplicateCount, 0);
  assert.equal(analysis.QualityStatus, 'OK');
});

test('extracts paragraph criteria like TMSPROD-2054', () => {
  const analysis = analyzeFixture('paragraph-criteria-tmsprod-2054.json');

  assert.equal(analysis.RawScenarioCount, 5);
  assert.equal(analysis.ScenarioCount, 5);
  assert.equal(analysis.QualityStatus, 'OK');
});

test('removes duplicate criteria and keeps logical ADF diff equivalent', () => {
  const analysis = analyzeFixture('duplicate-criteria.json');

  assert.equal(analysis.RawScenarioCount, 3);
  assert.equal(analysis.ScenarioCount, 2);
  assert.equal(analysis.RawDuplicateCount, 1);
  assert.equal(analysis.DuplicateCount, 0);
  assert.equal(analysis.Diff.Equivalent, true);
});

test('flags mojibake in fixture content', () => {
  const analysis = analyzeFixture('mojibake-quality-failure.json');

  assert.equal(analysis.QualityStatus, 'FAIL');
  assert.match(analysis.QualityErrors.join('\n'), /mojibake marker/);
});

test('flags invalid existing Test Case summaries', () => {
  const analysis = analyzeFixture('invalid-tc-summary-quality-failure.json');

  assert.equal(analysis.QualityStatus, 'FAIL');
  assert.match(analysis.QualityErrors.join('\n'), /Existing Test Case summary does not match/);
});

test('cleans dangling endings and preserves Spanish Gherkin like BS-2667', () => {
  const analysis = analyzeFixture('bs-2667-skyview-gherkin.json');

  assert.equal(analysis.QualityStatus, 'OK', analysis.QualityErrors.join('\n'));
  assert.equal(analysis.ScenarioCount, 4);

  const danglingEnding = /\s(?:y(?:\s+se)?|de|con|para|por|en|al|a|la|el|los|las|un|una|que|se)$/i;
  for (const text of [...analysis.Summaries, ...analysis.ListItems]) {
    assert.doesNotMatch(text, danglingEnding, text);
  }
  assert.equal(
    analysis.Summaries[2],
    'QA-876 | TC3: Happy path - Recorren las funciones de Skyview disponibles para apllogistics',
  );
  assert.doesNotMatch(analysis.ListItems[2], /\sy\s+se$/i, analysis.ListItems[2]);

  const tc1 = analysis.GwtSteps.find((step) => step.Number === 1);
  assert.ok(tc1, 'TC1 GWT steps were not returned by fixture analysis');
  assert.match(tc1.Given, /usuario ingresa desde su cuenta SSO personal/i);
  assert.match(tc1.When, /seleccione o acceda a Skyview/i);
  assert.match(tc1.Then, /visualiza correctamente la vista de Skyview/i);
  assert.doesNotMatch(tc1.Given, /funcionalidad de Dado Que/i);
  assert.doesNotMatch(tc1.When, /Dado que.*cuando/i);
});
