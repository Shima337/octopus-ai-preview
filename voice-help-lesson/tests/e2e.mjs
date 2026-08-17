import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAppServer } from '../server/serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = createAppServer({ rootDir: process.cwd(), transcribe: null });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  const externalRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const transcripts = [
      'Мне обещают подарок и просят пароль. Я ничего не нажал и хочу показать это взрослому.',
      'Незнакомец просит фотографию школы. Я закрыл чат и позвал маму.',
      'В чате ребенка обижают. Я сохранил сообщения и покажу взрослому.',
    ];
    globalThis.__VOICE_LESSON_TEST__ = {
      createRecorder: () => ({
        async start() { return true; },
        async stop() { return { blob: new Blob(['voice'], { type: 'audio/webm' }), durationMs: 900, reason: 'manual' }; },
      }),
      transcribeAudio: async () => ({ text: transcripts.shift() }),
    };
  });
  await page.goto(baseUrl);

  assert.equal(await page.locator('[data-screen="welcome"]').count(), 1);
  await page.locator('[data-action="START"]').click();
  assert.equal(await page.locator('[data-screen="privacy"]').count(), 1);
  await page.locator('[data-action="ACCEPT_PRIVACY"]').click();

  for (let index = 0; index < 3; index += 1) {
    assert.equal(await page.locator('[data-screen="scenario"]').count(), 1);
    await page.locator('[data-action="START_RECORDING"]').click();
    assert.equal(await page.locator('[data-recording-status="recording"]').count(), 1);
    await page.locator('[data-action="STOP_RECORDING"]').click();
    assert.equal(await page.locator('[data-screen="transcript"]').count(), 1);
    assert.equal((await page.locator('[data-transcript]').inputValue()).length > 20, true);
    await page.locator('[data-action="CHECK_ANSWER"]').click();
    assert.equal(await page.locator('[data-screen="feedback"]').count(), 1);
    assert.equal(await page.locator('[data-shield-part].complete').count(), 3);
    await page.locator('[data-action="CONTINUE"]').click();
  }

  assert.equal(await page.locator('[data-screen="final"]').count(), 1);
  assert.equal(await page.locator('[data-completed-scenario]').count(), 3);
  assert.equal(await page.locator('h1:visible').count(), 1);
  assert.equal(await page.locator('button:visible').evaluateAll((buttons) => buttons.filter((button) => !(button.getAttribute('aria-label') || button.textContent.trim())).length), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);

  const fallbackPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await fallbackPage.goto(baseUrl);
  await fallbackPage.locator('[data-action="START"]').click();
  await fallbackPage.locator('[data-action="ACCEPT_PRIVACY"]').click();
  await fallbackPage.locator('[data-action="TEXT_MODE"]').click();
  await fallbackPage.locator('[data-transcript]').fill('Мне обещают подарок');
  await fallbackPage.locator('[data-action="CHECK_ANSWER"]').click();
  assert.equal(await fallbackPage.locator('[data-shield-part].complete').count(), 1);
  assert.equal(await fallbackPage.locator('[data-action="RETRY"]').count(), 1);
  await fallbackPage.locator('[data-action="RETRY"]').click();
  await fallbackPage.locator('[data-action="TEXT_MODE"]').click();
  await fallbackPage.locator('[data-transcript]').fill('Мне обещают подарок и просят пароль');
  await fallbackPage.locator('[data-action="CHECK_ANSWER"]').click();
  assert.equal(await fallbackPage.locator('[data-action="USE_EXAMPLE"]').count(), 1);
  await fallbackPage.locator('[data-action="USE_EXAMPLE"]').click();
  assert.equal(await fallbackPage.locator('[data-shield-part].complete').count(), 3);
  await fallbackPage.close();

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
