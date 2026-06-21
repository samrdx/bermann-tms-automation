#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const registryPath = path.join(process.cwd(), '.atl', 'skill-registry.md');

if (!fs.existsSync(registryPath)) {
  console.error(`Skill registry not found: ${registryPath}`);
  process.exit(1);
}

const content = fs.readFileSync(registryPath, 'utf8');
process.stdout.write(content);
