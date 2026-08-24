import { expect, test } from '@playwright/test';

test('publishes valid crawler instructions instead of the app fallback', async ({ request }) => {
  const response = await request.get('/robots.txt');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).toMatch(/^User-agent: \*\s+Allow: \/\s*$/);
});

test('every primary CTA preserves attribution and adds its own landing dimension', async ({ page }) => {
  await page.goto('/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=august&utm_content=video_2&ttclid=tt-click&campaign_id=campaign-7&adset_id=adset-8&ad_id=ad-9&creative_id=creative-10&placement=tiktok_feed&funnel=spoofed&landing_cta=spoofed');

  const links = page.getByRole('link', {
    name: /пройти тему бесплатно|попробовать первую игру бесплатно|попробовать бесплатно|запустить ai-репетитора/i,
  });

  await expect(links).toHaveCount(4);
  const placements = ['hero', 'games', 'pricing', 'final'];
  for (let index = 0; index < 4; index += 1) {
    await expect(links.nth(index)).toHaveAttribute(
      'href',
      `https://web.ct-bratan.by/api/marketing/click?funnel=learning_path&utm_source=tiktok&utm_medium=paid_social&utm_campaign=august&utm_content=video_2&ttclid=tt-click&campaign_id=campaign-7&adset_id=adset-8&ad_id=ad-9&creative_id=creative-10&placement=tiktok_feed&landing_surface=octopus_ai&landing_cta=${placements[index]}`,
    );
  }
});

test('direct visits still route through Marketing Click without invented campaign attribution', async ({ page }) => {
  await page.goto('/');

  const hero = page.getByRole('link', { name: 'Пройти тему бесплатно' });
  await expect(hero).toHaveAttribute(
    'href',
    'https://web.ct-bratan.by/api/marketing/click?funnel=learning_path&landing_surface=octopus_ai&landing_cta=hero',
  );
});
