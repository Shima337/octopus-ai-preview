import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const validatorPath = resolve(process.cwd(), 'scripts/validate-production-env.mjs');

it('rejects Telegram usernames containing placeholder patterns', () => {
  const result = spawnSync(process.execPath, [validatorPath], {
    env: { ...process.env, VITE_TELEGRAM_BOT_URL: 'https://t.me/example_bot' },
  });

  expect(result.status).toBe(1);
});
