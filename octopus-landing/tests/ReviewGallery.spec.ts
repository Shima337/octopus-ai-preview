import { expect, test, type Page } from '@playwright/test';

type BrowserIssue = { type: string; text: string };

function captureBrowserIssues(page: Page) {
  const issues: BrowserIssue[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push({ type: `console:${message.type()}`, text: message.text() });
    }
  });
  page.on('pageerror', (error) => issues.push({ type: 'pageerror', text: error.message }));
  return issues;
}

async function activeElementName(page: Page) {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return 'none';
    return element.getAttribute('data-testid')
      ?? element.getAttribute('aria-label')
      ?? element.tagName.toLowerCase();
  });
}

test.describe('ReviewGallery browser contracts', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile track scrolls inline with a visible next-review hint and no page overflow', async ({ page }) => {
    const issues = captureBrowserIssues(page);
    await page.goto('/');

    const track = page.getByRole('list', { name: 'Видеоотзывы' });
    await track.scrollIntoViewIfNeeded();

    const contract = await track.evaluate((element) => {
      const style = getComputedStyle(element);
      const slides = Array.from(element.children);
      const first = slides[0]?.getBoundingClientRect();
      const second = slides[1]?.getBoundingClientRect();
      return {
        overflowX: style.overflowX,
        gridAutoFlow: style.gridAutoFlow,
        scrollSnapType: style.scrollSnapType,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        first: first && { left: first.left, right: first.right },
        second: second && { left: second.left, right: second.right },
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(contract).toMatchObject({
      overflowX: 'auto',
      gridAutoFlow: 'column',
      scrollSnapType: 'inline mandatory',
      pageOverflow: 0,
    });
    expect(contract.scrollWidth).toBeGreaterThan(contract.clientWidth);
    expect(contract.first!.left).toBeGreaterThanOrEqual(0);
    expect(contract.first!.right).toBeLessThanOrEqual(390);
    expect(contract.second!.left).toBeLessThan(390);
    expect(contract.second!.right).toBeGreaterThan(390);

    await track.evaluate((element) => element.scrollBy({ left: 260, behavior: 'instant' }));
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    if (process.env.REVIEW_GALLERY_EVIDENCE === '1') {
      console.info(`MOBILE_CONTRACT ${JSON.stringify(contract)}`);
    }
    expect(issues).toEqual([]);
  });

  test('modal frame is circular and focus remains contained across browser control models', async ({ page, browserName }) => {
    const issues = captureBrowserIssues(page);
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Отзыв 1. Смотреть со звуком' });
    await opener.scrollIntoViewIfNeeded();
    await opener.click();

    const dialog = page.getByRole('dialog', { name: 'Отзыв 1' });
    const close = page.getByRole('button', { name: 'Закрыть видеоотзыв' });
    const frame = page.getByTestId('active-review-frame');
    const video = page.getByTestId('active-review');
    await expect(close).toBeFocused();

    const circleContract = await frame.evaluate((element) => {
      const style = getComputedStyle(element);
      const videoElement = element.querySelector('video')!;
      const videoStyle = getComputedStyle(videoElement);
      const bounds = element.getBoundingClientRect();
      return {
        aspectRatio: style.aspectRatio,
        borderRadius: style.borderRadius,
        overflow: style.overflow,
        objectFit: videoStyle.objectFit,
        width: bounds.width,
        height: bounds.height,
      };
    });
    expect(circleContract).toMatchObject({
      aspectRatio: '1 / 1',
      borderRadius: '50%',
      overflow: 'hidden',
      objectFit: 'cover',
    });
    expect(Math.abs(circleContract.width - circleContract.height)).toBeLessThanOrEqual(1);

    const focusSequence = [await activeElementName(page)];
    const containmentSequence = [await dialog.evaluate((element) => element.contains(document.activeElement))];
    if (browserName === 'chromium') {
      await page.keyboard.press('Tab');
      focusSequence.push(await activeElementName(page));
      containmentSequence.push(await dialog.evaluate((element) => element.contains(document.activeElement)));
      await expect(video).toBeFocused();
      await page.keyboard.press('Tab');
      focusSequence.push(await activeElementName(page));
      containmentSequence.push(await dialog.evaluate((element) => element.contains(document.activeElement)));
      await expect(video).toBeFocused();

      let wrapped = false;
      for (let press = 0; press < 16; press += 1) {
        await page.keyboard.press('Tab');
        focusSequence.push(await activeElementName(page));
        containmentSequence.push(await dialog.evaluate((element) => element.contains(document.activeElement)));
        if (await close.evaluate((element) => element === document.activeElement)) {
          wrapped = true;
          break;
        }
      }
      expect(wrapped).toBe(true);
      await page.keyboard.press('Shift+Tab');
      await expect(video).toBeFocused();
    } else {
      await page.keyboard.press('Tab');
      focusSequence.push(await activeElementName(page));
      containmentSequence.push(await dialog.evaluate((element) => element.contains(document.activeElement)));
    }
    expect(containmentSequence.every(Boolean)).toBe(true);
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    if (process.env.REVIEW_GALLERY_EVIDENCE === '1') {
      console.info(`MOBILE_CIRCLE ${JSON.stringify(circleContract)}`);
      console.info(`CHROMIUM_FOCUS_SEQUENCE ${focusSequence.join(' -> ')}`);
    }
    expect(issues).toEqual([]);
  });
});

test('desktop gallery and modal preserve grid, circular geometry, containment, and clean console', async ({ page }) => {
  const issues = captureBrowserIssues(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const track = page.getByRole('list', { name: 'Видеоотзывы' });
  await track.scrollIntoViewIfNeeded();
  const reviewButtons = track.getByRole('button', { name: /Отзыв \d+\. Смотреть со звуком/u });
  await expect(reviewButtons).toHaveCount(8);
  const galleryContract = await track.evaluate((element) => {
    const style = getComputedStyle(element);
    const slides = Array.from(element.children).map((slide) => {
      const bounds = slide.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top };
    });
    return {
      gridAutoFlow: style.gridAutoFlow,
      overflowX: style.overflowX,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      slides,
    };
  });
  expect(galleryContract).toMatchObject({
    gridAutoFlow: 'row',
    overflowX: 'visible',
    pageOverflow: 0,
  });
  expect(new Set(galleryContract.slides.slice(0, 4).map((slide) => Math.round(slide.top))).size).toBe(1);
  expect(new Set(galleryContract.slides.slice(4).map((slide) => Math.round(slide.top))).size).toBe(1);
  expect(galleryContract.slides[4].top).toBeGreaterThan(galleryContract.slides[0].top);

  await page.getByRole('button', { name: 'Отзыв 1. Смотреть со звуком' }).click();
  const dialog = page.getByRole('dialog', { name: 'Отзыв 1' });
  const frame = page.getByTestId('active-review-frame');
  const geometry = await frame.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      aspectRatio: style.aspectRatio,
      borderRadius: style.borderRadius,
      overflow: style.overflow,
      objectFit: getComputedStyle(element.querySelector('video')!).objectFit,
      width: bounds.width,
      height: bounds.height,
    };
  });
  expect(geometry).toMatchObject({
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    overflow: 'hidden',
    objectFit: 'cover',
  });
  expect(Math.abs(geometry.width - geometry.height)).toBeLessThanOrEqual(1);
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  if (process.env.REVIEW_GALLERY_EVIDENCE === '1') {
    console.info(`DESKTOP_GALLERY ${JSON.stringify(galleryContract)}`);
    console.info(`DESKTOP_CIRCLE ${JSON.stringify(geometry)}`);
  }
  expect(issues).toEqual([]);
});
