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
  assert.equal(await page.locator('[data-screen] h1:visible').count(), 1);
  await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
  assert.equal(await page.locator('h1[tabindex="-1"]').evaluate((heading) => getComputedStyle(heading).outlineStyle), 'none');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('[data-mission-id="cybercat"]').click();
  assert.equal(await page.evaluate(() => window.scrollY), 0);
  await page.locator('[data-action="HOME"]').click();

  await page.locator('[data-mission-id="cybercat"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-screen="intro"]').count(), 1);
  await page.locator('[data-action="HOME"]').click();

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
    assert.equal(await page.locator('[data-screen] h1:visible').count(), 1);
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
  await page.waitForFunction(() => Boolean(document.activeElement?.closest('[data-reset-panel]')));
  assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-reset-panel]'))), true);
  await page.locator('[data-action="CONFIRM_RESET"]').click();
  assert.match(await page.locator('.score-pill').innerText(), /0\/3/);

  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      unnamedControls: [...document.querySelectorAll('button, a, input')]
        .filter((element) => !(element.getAttribute('aria-label') || element.textContent.trim())).length,
    }));
    assert.ok(metrics.scrollWidth <= metrics.innerWidth, JSON.stringify({ viewport, metrics }));
    assert.equal(metrics.unnamedControls, 0);
  }

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
} finally {
  await browser.close();
}
