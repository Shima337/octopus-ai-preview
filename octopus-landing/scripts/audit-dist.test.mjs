import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  writeFileSync(
    join(root, 'assets', 'index.js'),
    'const poster = "/media/games/game-01.webp"; const video = "/media/games/game-01.mp4";',
  );
  writeFileSync(join(root, 'assets', 'index.css'), '.hero { color: purple; }');
  writeFileSync(join(root, 'media', 'games', 'game-01.webp'), 'poster');
  writeFileSync(join(root, 'media', 'games', 'game-01.mp4'), 'h264');
  writeFileSync(join(root, 'og-image.jpg'), 'social image');
  writeFileSync(join(root, 'favicon.svg'), '<svg />');
  writeFileSync(
    join(root, 'index.html'),
    '<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/assets/index.css">'
      + '<meta property="og:image" content="/og-image.jpg"><script src="/assets/index.js"></script>',
  );
  for (const legalPage of ['privacy.html', 'offer.html', 'legal.html']) {
    writeFileSync(
      join(root, legalPage),
      '<!doctype html><html lang="ru"><head><meta name="robots" content="index,follow"></head>'
        + '<body><main><h1>Утверждённый документ</h1></main></body></html>',
    );
  }
  return root;
}

function createFakeFfprobe() {
  const root = mkdtempSync(join(tmpdir(), 'octopus-ffprobe-'));
  temporaryDirectories.push(root);
  const executable = join(root, 'ffprobe');
  writeFileSync(executable, `#!/bin/sh
for argument do input="$argument"; done
if [ "$(cat "$input")" = "hevc" ]; then
  printf '%s\n' '{"streams":[{"codec_name":"hevc","profile":"Main","codec_tag_string":"hvc1","pix_fmt":"yuv420p"}]}'
else
  printf '%s\n' '{"streams":[{"codec_name":"h264","profile":"High","codec_tag_string":"avc1","pix_fmt":"yuv420p"}]}'
fi
`);
  chmodSync(executable, 0o755);
  return executable;
}

function runAudit(root, { base, draft = false } = {}) {
  return spawnSync(process.execPath, [
    auditPath,
    root,
    ...(draft ? ['--draft'] : []),
    ...(base ? [`--base=${base}`] : []),
  ], {
    encoding: 'utf8',
    env: { ...process.env, FFPROBE_BIN: createFakeFfprobe() },
  });
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

it('accepts the same artifact under a GitHub Pages project base path', () => {
  const root = createDistFixture();
  writeFileSync(
    join(root, 'assets', 'index.js'),
    'const poster = "/octopus-ai-preview/media/games/game-01.webp"; '
      + 'const video = "/octopus-ai-preview/media/games/game-01.mp4";',
  );
  writeFileSync(
    join(root, 'index.html'),
    '<link rel="icon" href="/octopus-ai-preview/favicon.svg">'
      + '<meta property="og:image" content="/octopus-ai-preview/og-image.jpg">',
  );

  const result = runAudit(root, { base: '/octopus-ai-preview/' });

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

it.each(['privacy.html', 'offer.html', 'legal.html'])(
  'rejects a release artifact whose %s page still contains the draft publication marker',
  (legalPage) => {
    const root = createDistFixture();
    writeFileSync(
      join(root, legalPage),
      '<!doctype html><html lang="ru"><body><p>Документ готовится к публикации</p></body></html>',
    );

    const result = runAudit(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(legalPage);
    expect(result.stderr).toContain('draft publication marker');
  },
);

it('rejects a release artifact whose legal page remains noindex', () => {
  const root = createDistFixture();
  writeFileSync(
    join(root, 'offer.html'),
    '<!doctype html><html lang="ru"><head><meta name="robots" content="noindex,follow"></head>'
      + '<body><h1>Публичная оферта</h1></body></html>',
  );

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('offer.html');
  expect(result.stderr).toContain('noindex');
});

it('allows draft legal markers only through the explicit draft artifact audit path', () => {
  const root = createDistFixture();
  for (const legalPage of ['privacy.html', 'offer.html', 'legal.html']) {
    writeFileSync(
      join(root, legalPage),
      '<!doctype html><html lang="ru"><head><meta name="robots" content="noindex"></head>'
        + '<body><p>Документ готовится к публикации</p></body></html>',
    );
  }

  const result = runAudit(root, { draft: true });

  expect(result.status).toBe(0);
});

it('rejects a page-media reference missing from the artifact', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'assets', 'index.js'), 'const poster = "/media/games/missing.webp";');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('media/games/missing.webp');
});

it.each([
  [
    'HTML',
    'index.html',
    '<link rel="icon" href="/favicon.svg"><meta property="og:image" content="/og-image.jpg">'
      + '<img src="/rogue-poster.jpg">',
  ],
  ['CSS', 'assets/index.css', '.hero { background: url("/rogue-poster.jpg"); }'],
  ['JavaScript', 'assets/index.js', 'const poster = "/rogue-poster.jpg";'],
  ['single-quoted JavaScript', 'assets/index.js', "const poster = '/rogue-poster.jpg';"],
])('rejects a built %s media reference outside the declared locations', (_kind, file, contents) => {
  const root = createDistFixture();
  writeFileSync(join(root, file), contents);

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('rogue-poster.jpg');
});

it('rejects an unexpected media reference in a JavaScript template literal', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'assets', 'index.js'), 'const poster = `/rogue-poster.jpg?v=2#card`;');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('rogue-poster.jpg?v=2#card');
});

it.each([
  ['tag terminator', '<img src=/rogue-poster.jpg>'],
  ['whitespace terminator', '<img src=/rogue-poster.jpg alt="Preview">'],
])('rejects an unexpected media reference in an unquoted HTML attribute before a %s', (_kind, image) => {
  const root = createDistFixture();
  writeFileSync(
    join(root, 'index.html'),
    '<link rel="icon" href="/favicon.svg"><meta property="og:image" content="/og-image.jpg">'
      + image,
  );

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('rogue-poster.jpg');
});

it('rejects an unexpected media reference with an uppercase extension', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'assets', 'index.js'), 'const poster = "/rogue-poster.JPG";');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('rogue-poster.JPG');
});

it('detects allowed media references with query and hash suffixes', () => {
  const root = createDistFixture();
  writeFileSync(
    join(root, 'assets', 'index.js'),
    'const poster = `/media/games/game-01.webp?v=2#poster`; '
      + 'const video = "/media/games/game-01.mp4#preview";',
  );

  const result = runAudit(root);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('4 references');
});

it('rejects an HEVC stream renamed with an mp4 extension', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'media', 'renamed.mp4'), 'hevc');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('media/renamed.mp4');
  expect(result.stderr).toContain('hevc');
});

it('rejects forbidden source formats even inside media', () => {
  const root = createDistFixture();
  writeFileSync(join(root, 'media', 'source.mov'), 'source');

  const result = runAudit(root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('source.mov');
});
