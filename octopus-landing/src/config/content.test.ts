import { expect, it } from 'vitest';
import { siteContent } from './content';

it('keeps the approved prices and external course URL', () => {
  expect(siteContent.aiPrice).toBe(49);
  expect(siteContent.livePrice).toBe(199);
  expect(siteContent.liveCourseUrl).toBe('https://www.ct-bratan.by/');
  expect(siteContent.games).toHaveLength(5);
  expect(siteContent.reviews).toHaveLength(8);
  expect(siteContent.reviews.at(-1)).toMatchObject({
    id: 'review-08',
    src: '/media/reviews/review-08.mp4',
    poster: '/media/reviews/review-08.webp',
  });
});
