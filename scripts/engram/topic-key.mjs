#!/usr/bin/env node

const [changeName, artifact] = process.argv.slice(2);

if (!changeName || !artifact) {
  console.error('Usage: npm run engram:topic-key -- <change-name> <artifact>');
  process.exit(1);
}

const normalizedChange = changeName.trim().toLowerCase().replace(/\s+/g, '-');
const normalizedArtifact = artifact.trim().toLowerCase().replace(/\s+/g, '-');

console.log(`sdd/${normalizedChange}/${normalizedArtifact}`);
