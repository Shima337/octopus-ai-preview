import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';

const validatorPath = resolve(process.cwd(), 'scripts/validate-production-env.mjs');
const temporaryDirectories = [];

function environmentWithoutBotUrl() {
  const environment = { ...process.env };
  delete environment.VITE_TELEGRAM_BOT_URL;
  return environment;
}

function runValidator({ botUrl, cwd = process.cwd(), args = [] } = {}) {
  const env = environmentWithoutBotUrl();
  if (botUrl !== undefined) env.VITE_TELEGRAM_BOT_URL = botUrl;

  return spawnSync(process.execPath, [validatorPath, ...args], {
    cwd,
    encoding: 'utf8',
    env,
  });
}

function createEnvDirectory(contents) {
  const directory = mkdtempSync(join(tmpdir(), 'octopus-production-env-'));
  temporaryDirectories.push(directory);
  writeFileSync(join(directory, '.env.local'), contents);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('rejects Telegram usernames containing placeholder patterns', () => {
  const result = runValidator({ botUrl: 'https://t.me/example_bot' });

  expect(result.status).toBe(1);
});

it.each([
  'https://t.me/octopus_test_bot',
  'https://t.me/octopus_demo_bot',
  'https://t.me/staging_octopus_bot',
  'https://t.me/octopus_dev_bot',
])('rejects an obvious non-production Telegram URL: %s', (botUrl) => {
  const result = runValidator({ botUrl });

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('A real VITE_TELEGRAM_BOT_URL is required for production.');
});

it('loads VITE_TELEGRAM_BOT_URL from a Vite-compatible .env.local file', () => {
  const cwd = createEnvDirectory('VITE_TELEGRAM_BOT_URL=https://t.me/octopus_release_bot\n');

  const result = runValidator({ cwd });

  expect(result.status).toBe(0);
});

it('accepts the configured campaign tracking URL', () => {
  const result = runValidator({ botUrl: 'https://web.ct-bratan.by/api/marketing/click?funnel=learning_path' });

  expect(result.status).toBe(0);
});

it('gives an explicit shell value precedence over .env.local', () => {
  const cwd = createEnvDirectory('VITE_TELEGRAM_BOT_URL=https://t.me/example_bot\n');

  const result = runValidator({ botUrl: 'https://t.me/octopus_release_bot', cwd });

  expect(result.status).toBe(0);
});

it('allows known test URLs only through the explicit draft validation path', () => {
  const releaseResult = runValidator({ botUrl: 'https://t.me/octopus_test_bot' });
  const draftResult = runValidator({
    botUrl: 'https://t.me/octopus_test_bot',
    args: ['--draft'],
  });

  expect(releaseResult.status).toBe(1);
  expect(draftResult.status).toBe(0);
});
