#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const DEFAULT_MESSAGE = 'chore(openspec): sync SDD artifacts';
const TARGET_REMOTE = 'origin';
const TARGET_BRANCH = 'main';
const OPENSPEC_PATH = 'openspec';

function fail(message) {
  console.error(`[sdd:sync:push] ${message}`);
  process.exit(1);
}

function runGit(args, options = {}) {
  const { capture = false, allowFailure = false } = options;
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (!allowFailure && result.status !== 0) {
    fail(`git ${args.join(' ')} failed with exit code ${result.status}`);
  }

  return result;
}

function getGitOutput(args) {
  const result = runGit(args, { capture: true });
  return result.stdout.trim();
}

function hasOpenSpecChanges() {
  const result = runGit(['status', '--porcelain=v1', '--untracked-files=all', '--', OPENSPEC_PATH], {
    capture: true,
  });

  return result.stdout.trim().length > 0;
}

function hasStagedOpenSpecChanges() {
  const result = runGit(['diff', '--cached', '--quiet', '--', OPENSPEC_PATH], {
    allowFailure: true,
  });

  return result.status === 1;
}

function main() {
  getGitOutput(['rev-parse', '--show-toplevel']);

  const branch = getGitOutput(['branch', '--show-current']);
  if (branch !== TARGET_BRANCH) {
    fail(`current branch is '${branch || '(detached)'}'; switch to '${TARGET_BRANCH}' before syncing canonical openspec artifacts`);
  }

  if (!hasOpenSpecChanges()) {
    console.log('[sdd:sync:push] No changes detected in openspec/. Nothing to commit or push.');
    return;
  }

  const message = (process.env.SDD_SYNC_MESSAGE || '').trim() || DEFAULT_MESSAGE;

  console.log(`[sdd:sync:push] Staging ${OPENSPEC_PATH}/ changes...`);
  runGit(['add', '--all', '--', OPENSPEC_PATH]);

  if (!hasStagedOpenSpecChanges()) {
    console.log('[sdd:sync:push] No staged changes remained after git add. Nothing to commit or push.');
    return;
  }

  console.log(`[sdd:sync:push] Creating commit with message: ${message}`);
  runGit(['commit', '--only', '-m', message, '--', OPENSPEC_PATH]);

  console.log(`[sdd:sync:push] Pushing ${TARGET_BRANCH} to ${TARGET_REMOTE}...`);
  runGit(['push', TARGET_REMOTE, TARGET_BRANCH]);

  console.log('[sdd:sync:push] OpenSpec artifacts synced successfully.');
}

main();
