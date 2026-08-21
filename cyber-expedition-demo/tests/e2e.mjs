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

  await exerciseLocksKeyboardOnly();
  await verifyConfiguredMessageVideo();
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

    await page.locator('[data-district-id="mirror"]').click();
    await assertPageFrame(page, viewport, 'mirror-video');
    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, viewport, 'mirror');
    assert.equal(await page.locator('[data-mirror-detail]:visible').count(), 6);
    assert.equal(await page.locator('[data-mirror-caption]:visible').count(), 3);

    await page.locator('[data-mirror-detail="cat"]').click();
    assert.equal(await page.locator('[data-mirror-detail="cat"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-action="SUBMIT_MIRROR"]').click();
    assert.match(await page.locator('[data-mirror-hint]').innerText(), /место|школ/i);
    assert.match(await page.locator('[data-mirror-found]').innerText(), /0\s*из\s*4/i);

    for (const detailId of ['school-sign', 'geotag', 'pass-card', 'house-number']) {
      await page.locator(`[data-mirror-detail="${detailId}"]`).click();
    }
    await page.locator('[data-mirror-caption="after-school"]').click();
    await page.locator('[data-action="SUBMIT_MIRROR"]').click();
    assert.equal(await page.locator('[data-mirror-hint]').count(), 1);
    assert.equal(
      await page.locator('[data-mirror-hint] p').innerText(),
      'Почти! Проверь, не выдаёт ли подпись место съёмки.',
    );
    await page.locator('[data-mirror-caption="cat-day"]').click();
    assert.equal(await page.locator('[data-mirror-caption="cat-day"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-mirror-hint]').count(), 0);
    await page.locator('[data-action="SUBMIT_MIRROR"]').click();

    await assertPageFrame(page, viewport, 'reward');
    assert.equal(await page.locator('[data-mirror-comparison="before"]:visible').count(), 1);
    assert.equal(await page.locator('[data-mirror-comparison="after"]:visible').count(), 1);
    assert.match(await page.locator('[data-reward-part]').innerText(), /личные данные/i);
    await page.locator('[data-action="CLAIM_REWARD"]').click();

    await assertPageFrame(page, viewport, 'map');
    assert.equal(await page.locator('[data-district-id="locks"]:not([disabled])').count(), 1);

    await page.locator('[data-district-id="locks"]').click();
    await assertPageFrame(page, viewport, 'locks-video');
    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, viewport, 'locks');
    assert.equal(await page.locator('input, textarea').count(), 0);
    assert.equal(await page.locator('[data-password-card]:visible').count(), 3);

    await page.locator('[data-password-card="digits"]').click();
    assert.match(await page.locator('[data-password-card="digits"]').innerText(), /легко угадать/i);
    await page.locator('[data-password-card="hero-name"]').click();
    assert.match(await page.locator('[data-password-card="hero-name"]').innerText(), /могут знать друзья/i);
    await page.locator('[data-password-card="long-random-phrase"]').click();

    for (const cardId of ['rocket', 'forest']) {
      await page.locator(`[data-phrase-card="${cardId}"]`).click();
    }
    assert.match(await page.locator('[data-phrase-progress]').innerText(), /2\s*из\s*3/i);
    assert.equal(await page.locator('[data-screen="reward"]').count(), 0);
    await page.locator('[data-phrase-card="teacup"]').click();
    assert.match(await page.locator('[data-phrase-progress]').innerText(), /3\s*из\s*3/i);

    await page.locator('[data-2fa-step="trusted-device"]').click();
    assert.match(await page.locator('[data-2fa-hint]').innerText(), /ничего страшного|ещё раз/i);
    assert.match(await page.locator('[data-phrase-progress]').innerText(), /3\s*из\s*3/i);
    assert.equal(await page.locator('[data-password-card][aria-pressed="true"]').count(), 3);
    for (const stepId of ['password', 'trusted-device', 'keep-code-secret']) {
      await page.locator(`[data-2fa-step="${stepId}"]`).click();
    }

    await assertPageFrame(page, viewport, 'reward');
    assert.match(await page.locator('[data-reward-part]').innerText(), /секретный ключ/i);
    assert.equal(await page.locator('[data-reward-part]').getAttribute('data-reward-part'), 'secret');
    await page.locator('[data-action="CLAIM_REWARD"]').click();
    await assertPageFrame(page, viewport, 'map');
    assert.equal(await page.locator('[data-district-id="traps"]:not([disabled])').count(), 1);
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
    await page.reload();
    await assertPageFrame(page, viewport, 'map');

    const previewControls = page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage]');
    assert.equal(await previewControls.count(), 8);
    assert.equal(await page.locator('[data-district-id]:not([disabled])').count(), 4);
    await page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage="mirror"]').click();
    await assertPageFrame(page, viewport, 'mirror-video');
    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, viewport, 'mirror');
    await page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage="map"]').click();
    await page.locator('[data-district-id="locks"]').click();
    await assertPageFrame(page, viewport, 'locks-video');
    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, viewport, 'locks');
    assert.equal(await page.locator('input[type="text"], input[type="password"], textarea').count(), 0);
    await page.locator('[data-password-card="digits"]').click();
    assert.match(await page.locator('[data-password-card="digits"]').innerText(), /легко угадать/i);
    await page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage="map"]').click();
    await page.locator('[data-district-id="messages"]').click();
    await assertPageFrame(page, viewport, 'messages-video');
    assert.equal(await page.locator('[data-media-mode="placeholder"]').count(), 1);
    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, viewport, 'chat');
    await page.locator('[data-action="JUMP_TO_PREVIEW"][data-preview-stage="voice"]').click();
    await assertPageFrame(page, viewport, 'voice-prepare');
    assert.deepEqual(failures, []);
  } finally {
    await page.close();
  }
}

async function exerciseLocksKeyboardOnly() {
  const viewport = { width: 1280, height: 800 };
  const { page, failures } = await monitoredPage(viewport);
  try {
    await page.goto(baseUrl);
    await page.locator('[data-action="CHOOSE_PREVIEW_MODE"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-district-id="locks"]').focus();
    await page.keyboard.press('Space');
    await assertPageFrame(page, viewport, 'locks-video');
    await page.locator('[data-action="SKIP_MEDIA"]').focus();
    await page.keyboard.press('Enter');
    await assertPageFrame(page, viewport, 'locks');

    for (const [cardId, key] of [
      ['digits', 'Enter'], ['hero-name', 'Space'], ['long-random-phrase', 'Enter'],
    ]) {
      await page.locator(`[data-password-card="${cardId}"]`).focus();
      await page.keyboard.press(key);
      await assertLocksFocus(page, 'passwordCard', cardId);
    }

    for (const [cardId, expectedNext, key] of [
      ['rocket', 'forest', 'Space'], ['forest', 'teacup', 'Enter'], ['teacup', null, 'Space'],
    ]) {
      await page.locator(`[data-phrase-card="${cardId}"]`).focus();
      await page.keyboard.press(key);
      if (expectedNext) await assertLocksFocus(page, 'phraseCard', expectedNext);
      else await assertLocksFocus(page, '2faStep', 'password');
    }

    await page.locator('[data-2fa-step="trusted-device"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-2fa-hint]').count(), 1);
    await assertLocksFocus(page, '2faStep', 'password');

    for (const [stepId, expectedNext, key] of [
      ['password', 'trusted-device', 'Space'],
      ['trusted-device', 'keep-code-secret', 'Enter'],
    ]) {
      await assertLocksFocus(page, '2faStep', stepId);
      await page.keyboard.press(key);
      await assertLocksFocus(page, '2faStep', expectedNext);
    }
    await page.keyboard.press('Space');

    await assertPageFrame(page, viewport, 'reward');
    assert.equal(await page.locator('[data-action="CLAIM_REWARD"]:focus').count(), 1);
    assert.equal(await page.locator('[data-reward-part="secret"]').count(), 1);
    assert.deepEqual(failures, []);
  } finally {
    await page.close();
  }
}

async function assertLocksFocus(page, datasetKey, expectedId) {
  assert.equal(await page.locator('[data-screen="locks"] :focus').count(), 1);
  assert.equal(
    await page.evaluate((key) => document.activeElement?.dataset[key] ?? null, datasetKey),
    expectedId,
  );
}

async function verifyConfiguredMessageVideo() {
  const { page, failures } = await monitoredPage({ width: 1280, height: 800 });
  try {
    await page.goto(baseUrl);
    await page.evaluate(async () => {
      const { VIDEOS } = await import('/src/content.js');
      const messageVideo = VIDEOS.find((video) => video.id === 'message-station');
      messageVideo.source = 'data:video/mp4;base64,';
      messageVideo.captions = 'data:text/vtt,WEBVTT';
    });
    await page.locator('[data-action="CHOOSE_PREVIEW_MODE"]').click();
    await page.locator('[data-district-id="messages"]').click();
    await assertPageFrame(page, { width: 1280, height: 800 }, 'messages-video');
    const video = page.locator('video');
    assert.equal(await video.count(), 1);
    assert.equal(await video.getAttribute('autoplay'), null);
    assert.equal(await video.locator('track[kind="captions"][srclang="ru"]').count(), 1);
    assert.equal(await video.locator('track').getAttribute('label'), 'Русские субтитры');
    await page.locator('[data-action="SKIP_MEDIA"]').click();
    await assertPageFrame(page, { width: 1280, height: 800 }, 'chat');
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
