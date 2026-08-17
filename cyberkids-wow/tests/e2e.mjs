import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (!request.url().startsWith(baseUrl)) externalRequests.push(request.url());
  });
  await page.goto(baseUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.equal(await page.locator('[data-screen="home"]').count(), 1);
  assert.equal(await page.locator('[data-mission-id]').count(), 3);

  const paths = [
    {
      id: 'cybercat',
      clues: ['unknown-sender', 'urgency', 'free-prize'],
      unsafe: 'open-link',
      badge: 'Детектив ссылок',
    },
    {
      id: 'digital-forest',
      clues: ['new-friend', 'school-photo', 'schedule'],
      badge: 'Хранитель личных данных',
    },
    {
      id: 'space-patrol',
      clues: ['new-channel', 'urgency', 'keep-secret'],
      badge: 'Защитник секретов',
    },
  ];

  for (const mission of paths) {
    await page.locator(`[data-mission-id="${mission.id}"]`).click();
    assert.equal(await page.locator('[data-screen="intro"]').count(), 1);
    await page.locator('[data-action="START"]').click();
    for (const clueId of mission.clues) {
      await page.locator(`[data-clue-id="${clueId}"]`).click();
    }
    await page.locator('[data-action="SUBMIT_CLUES"]').click();
    assert.equal(await page.locator('[data-screen="decision"]').count(), 1);

    if (mission.unsafe) {
      await page.locator(`[data-action-id="${mission.unsafe}"]`).click();
      assert.equal(await page.locator('[data-screen="feedback"] .try-again').count(), 1);
      await page.locator('[data-action="RETRY"]').click();
      assert.equal(await page.locator('[data-screen="decision"]').count(), 1);
    }

    await page.locator('[data-action-id="tell-adult"]').click();
    assert.equal(await page.locator('[data-screen="feedback"] .success').count(), 1);
    await page.locator('[data-action="CONTINUE"]').click();
    assert.equal(await page.locator('[data-screen="reward"]').count(), 1);
    assert.match(await page.locator('[data-screen="reward"]').innerText(), new RegExp(mission.badge));
    await page.locator('[data-action="CONTINUE"]').click();
  }

  assert.match(await page.locator('.score-pill').innerText(), /3\/3/);
  assert.equal(await page.locator('.mission-status', { hasText: 'Пройдено' }).count(), 3);
  await page.reload();
  assert.match(await page.locator('.score-pill').innerText(), /3\/3/);

  await page.locator('[data-action="OPEN_RESET"]').click();
  assert.equal(await page.locator('[data-reset-panel]').count(), 1);
  await page.locator('[data-action="CONFIRM_RESET"]').click();
  assert.match(await page.locator('.score-pill').innerText(), /0\/3/);

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
} finally {
  await browser.close();
}
