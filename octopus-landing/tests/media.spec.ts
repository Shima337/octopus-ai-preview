import { expect, test } from '@playwright/test';

test('game previews stay muted and cannot activate audio', async ({ page }) => {
  await page.goto('/');
  const games = page.getByRole('region', { name: 'Примеры обучающих игр' });
  const previews = games.locator('video');

  await expect(previews).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) {
    const preview = previews.nth(index);
    await expect(preview).toHaveJSProperty('muted', true);
    await expect(preview).toHaveJSProperty('playsInline', true);
    await expect(preview).not.toHaveAttribute('controls', '');
  }

  await previews.first().click();
  await expect(previews.first()).toHaveJSProperty('muted', true);
});

test('review dialogs expose one unmuted video and pause the closed review', async ({ page }) => {
  await page.goto('/');
  const firstOpener = page.getByRole('button', { name: 'Отзыв 1. Смотреть со звуком' });
  await firstOpener.scrollIntoViewIfNeeded();
  await firstOpener.click();

  const dialogs = page.getByRole('dialog');
  await expect(dialogs).toHaveCount(1);
  await expect(dialogs).toBeVisible();
  const firstVideo = page.getByTestId('active-review');
  await expect(firstVideo).toHaveJSProperty('muted', false);
  const firstVideoHandle = await firstVideo.elementHandle();
  expect(firstVideoHandle).not.toBeNull();

  await page.getByRole('button', { name: 'Закрыть видеоотзыв' }).click();
  await page.getByRole('button', { name: 'Отзыв 2. Смотреть со звуком' }).click();
  await expect(page.getByRole('dialog', { name: 'Отзыв 2' })).toBeVisible();
  expect(await firstVideoHandle!.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
});

test('review dialog closes with Escape and backdrop while restoring its opener', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Отзыв 1. Смотреть со звуком' });
  await opener.scrollIntoViewIfNeeded();
  await opener.click();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();

  await opener.click();
  await page.locator('.review-modal').click({ position: { x: 8, y: 8 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('FAQ questions operate from the keyboard and expose one answer at a time', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'Можно ли полностью подготовиться только с AI?' });
  const second = page.getByRole('button', { name: 'Как работает бесплатная неделя?' });

  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Можно ли полностью подготовиться только с AI?' })).toBeVisible();

  await second.focus();
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('region', { name: 'Как работает бесплатная неделя?' })).toBeVisible();
});

test('reduced motion keeps game and review previews paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const games = page.getByRole('region', { name: 'Примеры обучающих игр' });
  await games.scrollIntoViewIfNeeded();
  const gamePausedStates = await games.locator('video').evaluateAll(
    (videos: HTMLVideoElement[]) => videos.map((video) => video.paused),
  );
  expect(gamePausedStates).toEqual([true, true, true, true, true]);

  const reviews = page.getByRole('region', { name: 'Видеоотзывы учеников' });
  await reviews.scrollIntoViewIfNeeded();
  const reviewPausedStates = await reviews.locator('.review-gallery__preview').evaluateAll(
    (videos: HTMLVideoElement[]) => videos.map((video) => video.paused),
  );
  expect(reviewPausedStates).toEqual([true, true, true, true, true, true, true]);
});
