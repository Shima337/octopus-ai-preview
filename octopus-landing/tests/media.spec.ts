import { expect, test } from '@playwright/test';

test('review previews play only when each circle is actually visible', async ({ page }) => {
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    const playIndexes: number[] = [];
    Object.defineProperty(window, '__reviewPreviewPlayIndexes', {
      configurable: true,
      value: playIndexes,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value(this: HTMLMediaElement) {
        if (this.matches('.review-gallery__preview')) {
          const previews = Array.from(document.querySelectorAll('.review-gallery__preview'));
          playIndexes.push(previews.indexOf(this));
        }
        return originalPlay.call(this);
      },
    });
  });
  await page.goto('/');
  const track = page.getByRole('list', { name: 'Видеоотзывы' });
  await track.scrollIntoViewIfNeeded();
  await expect(track).toBeInViewport();

  const visibleIndexes = await track.evaluate((element) => {
    const clip = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll<HTMLVideoElement>('.review-gallery__preview'))
      .flatMap((video, index) => {
        const bounds = video.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(bounds.right, clip.right, innerWidth)
          - Math.max(bounds.left, clip.left, 0));
        const visibleHeight = Math.max(0, Math.min(bounds.bottom, clip.bottom, innerHeight)
          - Math.max(bounds.top, clip.top, 0));
        const ratio = (visibleWidth * visibleHeight) / (bounds.width * bounds.height);
        return ratio >= 0.2 ? [index] : [];
      });
  });

  await expect.poll(() => page.evaluate(() => Array.from(new Set(
    (window as typeof window & { __reviewPreviewPlayIndexes: number[] })
      .__reviewPreviewPlayIndexes,
  )).sort((left, right) => left - right))).toEqual(visibleIndexes);
});

test('game, review preview, and active modal expose poster-preserving retry states', async ({ page }) => {
  await page.goto('/');

  const gameVideo = page.getByRole('region', { name: 'Примеры обучающих игр' }).locator('video').first();
  await gameVideo.scrollIntoViewIfNeeded();
  await gameVideo.dispatchEvent('error');
  await expect(page.getByRole('status', { name: 'Игра 1: ошибка видео' })).toContainText('Видео не загрузилось.');
  await expect(gameVideo).toHaveAttribute('poster', '/media/games/game-01.webp');
  await page.getByRole('button', { name: 'Повторить загрузку игры 1' }).click();
  await expect(page.getByRole('status', { name: 'Игра 1: ошибка видео' })).toHaveCount(0);

  const firstReviewPreview = page.locator('.review-gallery__preview').first();
  await firstReviewPreview.scrollIntoViewIfNeeded();
  await firstReviewPreview.dispatchEvent('error');
  await expect(page.getByRole('status', { name: 'Отзыв 1: ошибка видео' })).toContainText('Видеоотзыв не загрузился.');
  await expect(firstReviewPreview).toHaveAttribute('poster', '/media/reviews/review-01.webp');
  await page.getByRole('button', { name: 'Повторить загрузку отзыва 1' }).click();
  await expect(page.getByRole('status', { name: 'Отзыв 1: ошибка видео' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Отзыв 2. Смотреть со звуком' }).click();
  const dialog = page.getByRole('dialog', { name: 'Отзыв 2' });
  const activeVideo = page.getByTestId('active-review');
  await activeVideo.dispatchEvent('error');
  await expect(dialog.getByRole('status', { name: 'Отзыв 2: ошибка видео' })).toContainText('Видеоотзыв не загрузился.');
  await expect(activeVideo).toHaveAttribute('poster', '/media/reviews/review-02.webp');
  await dialog.getByRole('button', { name: 'Повторить загрузку отзыва 2' }).click();
  await expect(dialog.getByRole('status', { name: 'Отзыв 2: ошибка видео' })).toHaveCount(0);
});

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
  await expect.poll(
    () => page.locator('video').evaluateAll(
      (videos: HTMLVideoElement[]) => videos.filter((video) => !video.muted).length,
    ),
    { message: 'exactly the active review may be unmuted' },
  ).toBe(1);
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

test('reduced motion prevents preview autoplay without blocking a user-opened review', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    const attempts: string[] = [];
    Object.defineProperty(window, '__mediaPlayAttempts', {
      configurable: true,
      value: attempts,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value(this: HTMLMediaElement) {
        const kind = this.matches('.media-carousel video')
          ? 'game-preview'
          : this.matches('.review-gallery__preview')
            ? 'review-preview'
            : this.matches('[data-testid="active-review"]')
              ? 'active-review'
              : 'other';
        attempts.push(kind);
        return originalPlay.call(this);
      },
    });
  });
  await page.goto('/');

  const games = page.getByRole('region', { name: 'Примеры обучающих игр' });
  await games.scrollIntoViewIfNeeded();
  await expect(games).toBeInViewport();

  const reviews = page.getByRole('region', { name: 'Видеоотзывы учеников' });
  await reviews.scrollIntoViewIfNeeded();
  await expect(reviews).toBeInViewport();
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));

  const previewAttempts = () => page.evaluate(() => (
    (window as typeof window & { __mediaPlayAttempts: string[] }).__mediaPlayAttempts
      .filter((kind) => kind === 'game-preview' || kind === 'review-preview')
  ));
  expect(await previewAttempts()).toEqual([]);

  await page.getByRole('button', { name: 'Отзыв 1. Смотреть со звуком' }).click();
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __mediaPlayAttempts: string[] }).__mediaPlayAttempts
      .filter((kind) => kind === 'active-review').length
  ))).toBe(1);
  expect(await previewAttempts()).toEqual([]);
  await expect(page.getByTestId('active-review')).toHaveJSProperty('muted', false);
});
