import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:4174';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(baseUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  assert.equal(await page.locator('[data-screen="welcome"]').count(), 1);
  await page.locator('[data-action="START"]').click();
  assert.equal(await page.locator('[data-video-id="digital-day"]').count(), 1);
  await page.locator('[data-action="SKIP_VIDEO"]').click();

  const answers = ['safe', 'check', 'danger', 'check', 'danger', 'safe'];
  for (const answer of answers) {
    assert.equal(await page.locator('[data-screen="warmup"]').count(), 1);
    await page.locator(`[data-warmup-answer="${answer}"]`).click();
    assert.equal(await page.locator('[data-warmup-feedback]').count(), 1);
    await page.locator('[data-action="NEXT_WARMUP"]').click();
  }

  assert.equal(await page.locator('[data-screen="warmup-result"]').count(), 1);
  await page.locator('[data-action="CONTINUE_WARMUP"]').click();
  assert.equal(await page.locator('[data-screen="map"]').count(), 1);

  for (const placeId of ['games', 'messages', 'device']) {
    await page.locator(`[data-place-id="${placeId}"]`).click();
  }
  await page.locator('[data-action="CONFIRM_MAP"]').click();
  assert.equal(await page.locator('[data-screen="expedition-video"]').count(), 1);
  await page.locator('[data-action="SKIP_VIDEO"]').click();
  assert.equal(await page.locator('[data-screen="case-clues"]').count(), 1);
} finally {
  await browser.close();
}
