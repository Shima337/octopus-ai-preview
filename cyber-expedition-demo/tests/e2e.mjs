import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createLessonServer } from '../server/serve.mjs';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

const server = createLessonServer({ rootDir: process.cwd(), env: {} });
const baseUrl = await listen(server);
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await exerciseChildMode(viewport);
    await exercisePreviewMode(viewport);
  }

  await verifyConfiguredVideo();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

async function exerciseChildMode(viewport) {
  const { page, failures } = await monitoredPage(viewport);
  try {
    await page.goto(baseUrl);
    await assertPageFrame(page, viewport, 'welcome');

    const childButton = page.locator('[data-action="CHOOSE_CHILD_MODE"]');
    await childButton.focus();
    await page.keyboard.press('Enter');
    await assertPageFrame(page, viewport, 'intro-video');
    assert.equal(await page.locator('[data-media-mode="placeholder"]').count(), 1);

    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, viewport, 'map');
    assert.equal(await page.locator('[data-district-id="mirror"]:not([disabled])').count(), 1);
    const lockedDistrict = page.locator('[data-district-id="locks"][disabled]');
    assert.equal(await lockedDistrict.count(), 1);
    assert.ok(Number(await lockedDistrict.evaluate((node) => getComputedStyle(node).opacity)) < 1);
    assert.deepEqual(failures, []);
  } finally {
    await page.close();
  }
}

async function exercisePreviewMode(viewport) {
  const { page, failures } = await monitoredPage(viewport);
  try {
    await page.goto(baseUrl);
    const previewButton = page.locator('[data-action="CHOOSE_PREVIEW_MODE"]');
    await previewButton.focus();
    await page.keyboard.press('Space');
    await assertPageFrame(page, viewport, 'map');

    const previewControls = page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage]');
    assert.equal(await previewControls.count(), 8);
    assert.equal(await page.locator('[data-district-id="locks"]:not([disabled])').count(), 1);
    await page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage="voice"]').click();
    await assertPageFrame(page, viewport, 'voice-prepare');
    assert.deepEqual(failures, []);
  } finally {
    await page.close();
  }
}

async function verifyConfiguredVideo() {
  const { page, failures } = await monitoredPage({ width: 1280, height: 800 });
  try {
    await page.goto(baseUrl);
    await page.evaluate(async () => {
      const { renderMediaSlot } = await import('/src/ui.js');
      document.querySelector('#app').innerHTML = renderMediaSlot(
        { screen: 'intro-video' },
        {
          source: 'data:video/mp4;base64,',
          poster: null,
          captions: 'data:text/vtt,WEBVTT',
          audio: null,
        },
      );
    });
    const video = page.locator('video');
    assert.equal(await video.count(), 1);
    assert.equal(await video.getAttribute('autoplay'), null);
    assert.equal(await video.locator('track[kind="captions"][srclang="ru"]').count(), 1);
    assert.equal(await video.locator('track').getAttribute('label'), 'Русские субтитры');
    assert.deepEqual(failures, []);
  } finally {
    await page.close();
  }
}

async function monitoredPage(viewport) {
  const page = await browser.newPage({ viewport });
  const failures = [];
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => failures.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'data:', 'blob:'].includes(url.hostname || url.protocol)) {
      failures.push(`external: ${request.url()}`);
    }
  });
  return { page, failures };
}

async function assertPageFrame(page, viewport, screen) {
  assert.equal(await page.locator(`[data-screen="${screen}"]`).count(), 1);
  assert.equal(await page.locator('h1:visible').count(), 1);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('main main').count(), 0);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth),
    true,
    `${viewport.width}x${viewport.height} must not overflow horizontally on ${screen}`,
  );
}
