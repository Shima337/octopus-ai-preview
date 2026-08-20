import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('contains search and social metadata', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('<html lang="ru">');
  expect(html).toMatch(/<title>.*ЦЭ\/ЦТ.*русскому.*<\/title>/);
  expect(html).toContain('property="og:image" content="/og-image.jpg"');
});
