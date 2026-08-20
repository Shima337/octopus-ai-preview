import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactRoot = resolve(process.argv[2] ?? 'dist');
const legalPages = ['privacy.html', 'offer.html', 'legal.html'];

for (const legalPage of legalPages) {
  const target = resolve(artifactRoot, legalPage);
  if (existsSync(target)) rmSync(target);
}

console.log('Removed draft legal documents from the public preview artifact.');
