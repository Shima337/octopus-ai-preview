import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('removes draft legal documents from the public preview artifact', () => {
  const root = mkdtempSync(join(tmpdir(), 'octopus-pages-preview-'));
  temporaryDirectories.push(root);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'index.html'), '<h1>Preview</h1>');
  for (const legalPage of ['privacy.html', 'offer.html', 'legal.html']) {
    writeFileSync(join(root, legalPage), '<p>Draft</p>');
  }

  const result = spawnSync(
    process.execPath,
    [resolve(process.cwd(), 'scripts/prepare-pages-preview.mjs'), root],
    { encoding: 'utf8' },
  );

  expect(result.status).toBe(0);
  expect(existsSync(join(root, 'index.html'))).toBe(true);
  for (const legalPage of ['privacy.html', 'offer.html', 'legal.html']) {
    expect(existsSync(join(root, legalPage))).toBe(false);
  }
});
