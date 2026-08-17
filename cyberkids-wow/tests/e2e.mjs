import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(baseUrl);
  assert.equal(await page.locator('[data-screen="home"]').count(), 1);
  assert.equal(await page.locator('[data-mission-id]').count(), 3);
} finally {
  await browser.close();
}
