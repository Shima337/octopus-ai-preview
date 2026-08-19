import { afterEach, expect, it, vi } from 'vitest';
import { track } from './analytics';

afterEach(() => {
  delete window.dataLayer;
});

it('publishes analytics events to the browser event stream and optional data layer', () => {
  const event = { name: 'telegram_cta_click', placement: 'hero' } as const;
  const listener = vi.fn();
  const dataLayer = { push: vi.fn() };
  window.addEventListener('octopus:analytics', listener);
  window.dataLayer = dataLayer;

  track(event);

  expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: event }));
  expect(dataLayer.push).toHaveBeenCalledWith(event);
  window.removeEventListener('octopus:analytics', listener);
});
