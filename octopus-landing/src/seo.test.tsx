import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('contains search and social metadata', () => {
  const html = readFileSync('index.html', 'utf8');
  const hero = readFileSync('src/sections/Hero.tsx', 'utf8');

  expect(html).toContain('<html lang="ru">');
  expect(html).toMatch(/<title>.*ЦЭ\/ЦТ.*русскому.*<\/title>/);
  expect(html).toMatch(/name="description"\s+content="[^"]*ЦЭ\/ЦТ[^"]*49 BYN[^"]*"/);
  expect(html).toContain('name="theme-color" content="#5b2bd9"');
  expect(html).toContain('rel="icon" href="%BASE_URL%favicon.svg" type="image/svg+xml"');
  expect(html).toContain('property="og:type" content="website"');
  expect(html).toMatch(/property="og:title" content="[^"]*ЦЭ\/ЦТ[^"]*русскому[^"]*"/);
  expect(html).toMatch(/property="og:description"\s+content="[^"]*49 BYN[^"]*"/);
  expect(html).toContain('property="og:image" content="%BASE_URL%og-image.jpg"');
  expect(html).toContain('property="og:image:width" content="1200"');
  expect(html).toContain('property="og:image:height" content="630"');
  expect(html).toMatch(/property="og:image:alt" content="[^"]*ЦЭ\/ЦТ[^"]*49 BYN[^"]*"/);
  expect(html).toContain('name="twitter:card" content="summary_large_image"');
  expect(hero).toContain("assetPath('/media/lyudmila.webp')");
});
