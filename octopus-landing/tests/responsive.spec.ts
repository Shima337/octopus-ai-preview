import { expect, test, type Locator } from '@playwright/test';

const viewportWidths = [320, 360, 393, 430, 768, 1440] as const;
const mobileWidths = new Set([320, 360, 393, 430]);

type VerticalBox = {
  label: string;
  top: number;
  bottom: number;
};

async function getVerticalBox(label: string, locator: Locator): Promise<VerticalBox> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} must have a rendered bounding box`).not.toBeNull();
  return {
    label,
    top: box!.y,
    bottom: box!.y + box!.height,
  };
}

test('landing has no horizontal overflow or overlapping mobile hero content', async ({ page }, testInfo) => {
  const geometry: Record<number, VerticalBox[]> = {};
  const overflow: Record<number, { scrollWidth: number; viewportWidth: number }> = {};

  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto('/');
    await page.locator('.hero__portrait-frame img').evaluate(async (image: HTMLImageElement) => {
      if (!image.complete) await new Promise((resolve) => image.addEventListener('load', resolve, { once: true }));
      await image.decode();
    });

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    overflow[width] = dimensions;
    expect(
      dimensions.scrollWidth,
      `${width}px viewport must not scroll horizontally`,
    ).toBeLessThanOrEqual(dimensions.viewportWidth);

    if (mobileWidths.has(width)) {
      const boxes = await Promise.all([
        getVerticalBox('hero heading', page.getByRole('heading', { level: 1 })),
        getVerticalBox('teacher method', page.locator('.hero__method')),
        getVerticalBox('teacher visual', page.locator('.hero__visual')),
        getVerticalBox('benefit explanation', page.locator('.hero__lead')),
        getVerticalBox('price', page.locator('.hero__price')),
        getVerticalBox(
          'primary CTA',
          page.getByRole('link', { name: 'Пройти тему бесплатно' }),
        ),
        getVerticalBox('trial note', page.locator('.hero__note')),
      ]);
      geometry[width] = boxes;

      for (let index = 0; index < boxes.length - 1; index += 1) {
        expect(
          boxes[index].bottom,
          `${width}px: ${boxes[index].label} must end before ${boxes[index + 1].label} begins`,
        ).toBeLessThanOrEqual(boxes[index + 1].top);
      }
    }

    const screenshotPath = testInfo.outputPath(`landing-${width}px.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach(`landing-${width}px`, {
      path: screenshotPath,
      contentType: 'image/png',
    });
  }

  testInfo.annotations.push({
    type: 'mobile-geometry',
    description: JSON.stringify(geometry),
  });
  if (process.env.RESPONSIVE_EVIDENCE === '1') {
    console.info(`RESPONSIVE_EVIDENCE ${JSON.stringify({
      browser: testInfo.project.name,
      overflow,
      geometry,
    })}`);
  }
});
