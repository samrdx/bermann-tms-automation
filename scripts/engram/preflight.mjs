#!/usr/bin/env node

const DEFAULT_PROJECT = 'bermann-tms-automation';
const DEFAULT_HEALTH_PATH = '/health';

function withNoTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

async function checkHealth(baseUrl, healthPath) {
  const endpoint = `${withNoTrailingSlash(baseUrl)}${healthPath.startsWith('/') ? healthPath : `/${healthPath}`}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    return {
      endpoint,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      endpoint,
      ok: false,
      status: 0,
      statusText: String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const baseUrl = process.env.ENGRAM_BASE_URL || '';
  const apiKey = process.env.ENGRAM_API_KEY || '';
  const project = process.env.ENGRAM_PROJECT || DEFAULT_PROJECT;
  const healthPath = process.env.ENGRAM_HEALTH_PATH || DEFAULT_HEALTH_PATH;

  const missing = [];
  if (!baseUrl) missing.push('ENGRAM_BASE_URL');

  if (missing.length > 0) {
    console.error(`\n[engram:preflight] Missing env vars: ${missing.join(', ')}`);
    console.error('[engram:preflight] Add them to .env or your shell environment.\n');
    process.exit(1);
  }

  console.log('\n[engram:preflight] Configuration');
  console.log(`- base URL: ${baseUrl}`);
  console.log(`- project : ${project}`);
  console.log(`- health  : ${healthPath}`);
  console.log(`- api key : ${apiKey ? 'configured' : 'not set (optional for local engram)'}`);

  const health = await checkHealth(baseUrl, healthPath);
  if (!health.ok) {
    console.error('\n[engram:preflight] Health check failed');
    console.error(`- endpoint: ${health.endpoint}`);
    console.error(`- status  : ${health.status} ${health.statusText}`);
    process.exit(1);
  }

  console.log('\n[engram:preflight] OK');
  console.log(`- endpoint: ${health.endpoint}`);
  console.log(`- status  : ${health.status} ${health.statusText}`);
  console.log('');
}

main();
