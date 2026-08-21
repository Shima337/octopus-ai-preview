import { afterEach, expect, it, vi } from 'vitest';
import { track } from './analytics';

afterEach(() => {
  delete window.dataLayer;
  delete window.fbq;
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

it('reports Telegram CTA clicks to Meta as Lead events with their placement', () => {
  window.fbq = vi.fn();

  track({ name: 'telegram_cta_click', placement: 'pricing' });

  expect(window.fbq).toHaveBeenCalledWith('track', 'Lead', {
    content_name: 'telegram_cta_click',
    button_location: 'pricing',
  });
});

it('does not report non-conversion interactions as Meta leads', () => {
  window.fbq = vi.fn();

  track({ name: 'faq_open', id: 'games' });

  expect(window.fbq).not.toHaveBeenCalled();
});
