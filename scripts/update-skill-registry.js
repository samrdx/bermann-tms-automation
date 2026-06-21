#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, '.atl');
const outputPath = path.join(outputDir, 'skill-registry.md');

const skillRoots = [
  path.join(projectRoot, '.agents', 'skills'),
  path.join(os.homedir(), '.config', 'opencode', 'skills'),
  path.join(os.homedir(), '.agents', 'skills'),
];

function readFrontmatter(markdown) {
  if (!markdown.startsWith('---')) {
    return {};
  }

  const end = markdown.indexOf('\n---', 3);
  if (end === -1) {
    return {};
  }

  const block = markdown.slice(3, end).trim();
  const fields = {};

  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }

  return fields;
}

function collectSkills(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillPath = path.join(root, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        return null;
      }

      const content = fs.readFileSync(skillPath, 'utf8');
      const frontmatter = readFrontmatter(content);
      const firstHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();

      return {
        name: frontmatter.name || entry.name,
        description: frontmatter.description || firstHeading || '',
        scope: root.startsWith(projectRoot) ? 'project' : 'global',
        path: skillPath,
      };
    })
    .filter(Boolean);
}

const skills = skillRoots.flatMap(collectSkills)
  .sort((a, b) => a.name.localeCompare(b.name));

const generatedAt = new Date().toISOString();
const lines = [
  '# Skill Registry',
  '',
  `Generated at: ${generatedAt}`,
  '',
  '| Skill | Scope | Description | Path |',
  '| --- | --- | --- | --- |',
  ...skills.map((skill) => `| ${skill.name} | ${skill.scope} | ${skill.description.replace(/\|/g, '\\|')} | ${skill.path} |`),
  '',
];

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log(`Updated ${outputPath} with ${skills.length} skills.`);
