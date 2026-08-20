import { expect, test } from '@playwright/test';

test('publishes valid crawler instructions instead of the app fallback', async ({ request }) => {
  const response = await request.get('/robots.txt');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).toMatch(/^User-agent: \*\s+Allow: \/\s*$/);
});

test('every primary CTA points directly to the configured bot', async ({ page }) => {
  await page.goto('/');

  const links = page.getByRole('link', {
    name: /пройти тему бесплатно|попробовать первую игру бесплатно|попробовать бесплатно|запустить ai-репетитора/i,
  });

  await expect(links).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(links.nth(index)).toHaveAttribute(
      'href',
      /^https:\/\/t\.me\/octopus_test_bot(?:\?|$)/,
    );
  }
});
