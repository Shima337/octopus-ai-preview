import { expect, it } from 'vitest';
import { siteContent } from './content';

it('keeps the approved prices and external course URL', () => {
  expect(siteContent.aiPrice).toBe(49);
  expect(siteContent.livePrice).toBe(199);
  expect(siteContent.liveCourseUrl).toBe('https://www.ct-bratan.by/');
  expect(siteContent.games).toHaveLength(5);
  expect(siteContent.reviews).toHaveLength(7);
});
