// scripts/clean.mjs
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const CLEANABLE_DIR_NAME = /^(playwright-report|test-results|allure-results|allure-report)(-.+)?$/;
const PLAYWRIGHT_ARTIFACTS_DIR_PREFIX = '.playwright-artifacts-';
const TRANSIENT_ERROR_CODES = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function removeDirWithRetry(targetPath) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await rm(targetPath, {
        recursive: true,
        force: true,
        maxRetries: 2,
        retryDelay: 100,
      });
      return;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return;
      }

      if (TRANSIENT_ERROR_CODES.has(error?.code) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      throw error;
    }
  }
}

async function removeNestedPlaywrightArtifacts(targetPath) {
  let entries;

  try {
    entries = await readdir(targetPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const nestedArtifactDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(PLAYWRIGHT_ARTIFACTS_DIR_PREFIX))
    .map((entry) => path.join(targetPath, entry.name));

  await Promise.all(nestedArtifactDirs.map((artifactDir) => removeDirWithRetry(artifactDir)));
}

async function listCleanableDirectories(cwdPath) {
  const entries = await readdir(cwdPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && CLEANABLE_DIR_NAME.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(cwdPath, entry.name),
    }));
}

if (String(process.env.SKIP_CLEAN).toLowerCase() === 'true') {
  console.log('🧪 SKIP_CLEAN=true detectado. Se preservan artefactos para agregación de resultados.');
  process.exit(0);
}

console.log('🧹 Iniciando limpieza de artefactos...');

try {
  const cwdPath = process.cwd();
  const cleanableDirs = await listCleanableDirectories(cwdPath);

  for (const cleanableDir of cleanableDirs) {
    if (cleanableDir.name.startsWith('test-results')) {
      await removeNestedPlaywrightArtifacts(cleanableDir.fullPath);
    }

    await removeDirWithRetry(cleanableDir.fullPath);
  }

  console.log('✅ Limpieza completada con éxito.');
} catch (error) {
  console.error('❌ Error durante la limpieza:', error);
  process.exit(1);
}
