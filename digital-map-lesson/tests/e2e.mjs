import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:4174';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
  });
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

  const cases = [
    { id: 'games-scam', clues: ['games-scam-one', 'games-scam-two', 'games-scam-three'], unsafe: 'claim-now', hasVideo: true },
    { id: 'messages-privacy', clues: ['messages-privacy-one', 'messages-privacy-two', 'messages-privacy-three'], hasVideo: false },
    { id: 'device-malware', clues: ['device-malware-one', 'device-malware-two', 'device-malware-three'], hasVideo: true },
  ];

  for (let index = 0; index < cases.length; index += 1) {
    const caseItem = cases[index];
    if (index > 0 && caseItem.hasVideo) {
      assert.equal(await page.locator('[data-screen="expedition-video"]').count(), 1);
      await page.locator('[data-action="SKIP_VIDEO"]').click();
    }
    assert.equal(await page.locator(`[data-case-id="${caseItem.id}"]`).count(), 1);
    for (const clueId of caseItem.clues) await page.locator(`[data-clue-id="${clueId}"]`).click();
    await page.locator('[data-action="SUBMIT_CASE_CLUES"]').click();
    assert.equal(await page.locator('[data-screen="case-decision"]').count(), 1);

    if (caseItem.unsafe) {
      await page.locator(`[data-action-id="${caseItem.unsafe}"]`).click();
      assert.equal(await page.locator('[data-screen="case-feedback"] .try-again').count(), 1);
      await page.locator('[data-action="RETRY_CASE"]').click();
    }

    await page.locator('[data-action-id="tell-adult"]').click();
    assert.equal(await page.locator('[data-screen="case-feedback"] .success').count(), 1);
    await page.locator('[data-action="CONTINUE_CASE"]').click();
  }

  assert.equal(await page.locator('[data-screen="shield"]').count(), 1);
  await page.locator('[data-shield-step="tell"]').click();
  assert.equal(await page.locator('[data-shield-hint]').count(), 1);
  for (const stepId of ['stop', 'dont', 'save', 'block', 'tell']) {
    await page.locator(`[data-shield-step="${stepId}"]`).click();
  }
  assert.equal(await page.locator('[data-video-id="safer-map"]').count(), 1);
  await page.locator('[data-action="SKIP_VIDEO"]').click();
  assert.equal(await page.locator('[data-screen="final"]').count(), 1);
  assert.match(await page.locator('.crystal-counter').innerText(), /4\/4/);
  assert.equal(await page.locator('[data-final-place]').count(), 3);
  assert.equal(await page.locator('h1:visible').count(), 1);
  assert.equal(await page.locator('button:visible').evaluateAll((buttons) => buttons.filter((button) => !(button.getAttribute('aria-label') || button.textContent.trim())).length), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  assert.equal(await page.locator('h1').evaluate((element) => getComputedStyle(element).outlineStyle), 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  assert.equal(await page.locator('.final-grid').evaluate((element) => element.getBoundingClientRect().width <= document.documentElement.clientWidth), true);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.reload();
  assert.equal(await page.locator('[data-screen="final"]').count(), 1);
  await page.locator('[data-action="OPEN_RESTART"]').click();
  assert.equal(await page.locator('[data-restart-panel]').count(), 1);
  await page.waitForFunction(() => document.activeElement?.id === 'restart-title');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'restart-title');
  await page.locator('[data-action="CONFIRM_RESTART"]').click();
  assert.equal(await page.locator('[data-screen="welcome"]').count(), 1);

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(baseUrl);
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload();
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await mobilePage.locator('[data-action="START"]').focus();
  await mobilePage.keyboard.press('Enter');
  assert.equal(await mobilePage.locator('[data-screen="video-intro"]').count(), 1);
  await mobilePage.close();

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
} finally {
  await browser.close();
}
