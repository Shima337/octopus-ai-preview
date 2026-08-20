import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(cleanup);

describe('App', () => {
  it('identifies the ЦЭ/ЦТ Russian-language product', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ЦЭ\/ЦТ по русскому/i);
  });

  it('exposes the footer as a content information landmark', () => {
    render(<App />);
    expect(screen.getByRole('contentinfo').closest('main')).toBeNull();
  });
});
