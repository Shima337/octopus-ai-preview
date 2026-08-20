import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import '../styles/sections.css';
import { Footer } from './Footer';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

it('gives every footer link a 44px minimum click target', () => {
  render(<Footer />);

  screen.getAllByRole('link').forEach((link) => {
    const style = getComputedStyle(link);
    expect(style.display).toBe('inline-flex');
    expect(style.minHeight).toBe('44px');
    expect(style.minWidth).toBe('44px');
  });
});

it('renders legal labels without URLs in the public preview', () => {
  vi.stubEnv('VITE_PUBLIC_PREVIEW', 'true');
  render(<Footer />);

  expect(screen.getByRole('link', { name: 'Основной сайт' })).toBeInTheDocument();
  for (const label of ['Политика конфиденциальности', 'Публичная оферта', 'Реквизиты']) {
    expect(screen.getByText(label)).not.toHaveRole('link');
  }
});
