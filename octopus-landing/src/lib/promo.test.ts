import { expect, it } from 'vitest';
import { isPromoActive } from './promo';

it('keeps the promotion active through 31 August in Minsk', () => {
  expect(isPromoActive(new Date('2026-08-31T20:59:59Z'), '2026-08-31')).toBe(true);
  expect(isPromoActive(new Date('2026-08-31T21:00:00Z'), '2026-08-31')).toBe(false);
});
