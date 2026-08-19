import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import * as analytics from '../lib/analytics';
import { TelegramCta } from './TelegramCta';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

it('tracks placement without preventing Telegram navigation', () => {
  const spy = vi.spyOn(analytics, 'track').mockImplementation(() => undefined);
  render(<TelegramCta placement="hero">Пройти тему бесплатно</TelegramCta>);
  const link = screen.getByRole('link');
  let defaultWasPrevented: boolean | undefined;
  const stopJsdomNavigation = (event: MouseEvent) => {
    defaultWasPrevented = event.defaultPrevented;
    event.preventDefault();
  };

  document.addEventListener('click', stopJsdomNavigation);
  fireEvent.click(link);
  document.removeEventListener('click', stopJsdomNavigation);

  expect(spy).toHaveBeenCalledWith({ name: 'telegram_cta_click', placement: 'hero' });
  expect(defaultWasPrevented).toBe(false);
  expect(link).toHaveAttribute('href', expect.stringMatching(/^(https:\/\/t\.me\/|tg:\/\/resolve)/));
  spy.mockRestore();
});

it('passes the CTA placement and current UTM values through a compact Telegram start parameter', () => {
  window.history.replaceState({}, '', '/?utm_source=instagram&utm_medium=story&utm_campaign=august');
  render(<TelegramCta placement="hero">Пройти тему бесплатно</TelegramCta>);

  const url = new URL(screen.getByRole('link').getAttribute('href') ?? '', 'https://octopus.test');

  expect(url.searchParams.get('start')).toBe('hero_instagram_story_august');
});
