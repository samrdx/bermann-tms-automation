import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const WORKFLOW_DIR = path.join('.github', 'workflows');
const WORKFLOW_EXTENSIONS = new Set(['.yml', '.yaml']);
const SCRIPT_PATTERN = /npm run\s+([A-Za-z0-9:_-]+)/g;

function extractReferencedScripts(content) {
  const matches = Array.from(content.matchAll(SCRIPT_PATTERN), (match) => match[1]);
  return [...new Set(matches)].sort();
}

async function readPackageScripts() {
  const packageJsonPath = path.resolve('package.json');
  const packageRaw = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageRaw);
  return new Set(Object.keys(packageJson.scripts ?? {}));
}

async function readWorkflowFiles() {
  const workflowDirPath = path.resolve(WORKFLOW_DIR);
  const entries = await readdir(workflowDirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && WORKFLOW_EXTENSIONS.has(path.extname(entry.name)))
    .map((entry) => entry.name)
    .sort();
}

async function validate() {
  const packageScripts = await readPackageScripts();
  const workflowFiles = await readWorkflowFiles();
  const failures = [];

  for (const workflowFile of workflowFiles) {
    const workflowPath = path.resolve(WORKFLOW_DIR, workflowFile);
    const workflowRaw = await readFile(workflowPath, 'utf8');
    const referencedScripts = extractReferencedScripts(workflowRaw);
    const missingScripts = referencedScripts.filter((script) => !packageScripts.has(script));

    if (missingScripts.length > 0) {
      failures.push({
        workflow: path.join('.github', 'workflows', workflowFile).replace(/\\/g, '/'),
        missingScripts,
        referencedScripts,
      });
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        workflowsChecked: workflowFiles.length,
      },
      null,
      2,
    ),
  );
}

validate().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
