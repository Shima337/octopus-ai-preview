import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';

const auditPath = resolve(process.cwd(), 'scripts/audit-dist.mjs');
const temporaryDirectories = [];

function createDistFixture() {
  const root = mkdtempSync(join(tmpdir(), 'octopus-dist-audit-'));
  temporaryDirectories.push(root);
  mkdirSync(join(root, 'assets'), { recursive: true });
  mkdirSync(join(root, 'media', 'games'), { recursive: true });
  writeFileSync(join(root, 'assets', 'index.js'), 'const poster = "/media/games/game-01.webp";');
  writeFileSync(join(root, 'media', 'games', 'game-01.webp'), 'poster');
  writeFileSync(join(root, 'og-image.jpg'), 'social image');
  writeFileSync(join(root, 'favicon.svg'), '<svg />');
  writeFileSync(
    join(root, 'index.html'),
    '<link rel="icon" href="/favicon.svg"><meta property="og:image" content="/og-image.jpg">',
  );
  return root;
}

function runAudit(root) {
  return spawnSync(process.execPath, [auditPath, root], { encoding: 'utf8' });
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('accepts page media under media and the two declared root metadata assets', () => {
  const result = runAudit(createDistFixture());

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Artifact media audit passed');
});

it('rejects an undeclared media file outside the media directory', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'unexpected-poster.png'), 'unexpected');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('unexpected-poster.png');
});

it('requires both stable root metadata assets', () => {
  const root = createDistFixture();
  rmSync(join(root, 'og-image.jpg'));

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('og-image.jpg');
});

it('rejects a page-media reference missing from the artifact', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'assets', 'index.js'), 'const poster = "/media/games/missing.webp";');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('media/games/missing.webp');
});

it('rejects forbidden source formats even inside media', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'media', 'source.mov'), 'source');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('source.mov');
});
