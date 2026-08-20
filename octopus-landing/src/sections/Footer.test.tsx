import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import '../styles/sections.css';
import { Footer } from './Footer';

afterEach(cleanup);

it('gives every footer link a 44px minimum click target', () => {
  render(<Footer />);

  screen.getAllByRole('link').forEach((link) => {
    const style = getComputedStyle(link);
    expect(style.display).toBe('inline-flex');
    expect(style.minHeight).toBe('44px');
    expect(style.minWidth).toBe('44px');
  });
});
