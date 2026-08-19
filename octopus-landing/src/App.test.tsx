import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('identifies the ЦЭ/ЦТ Russian-language product', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ЦЭ\/ЦТ по русскому/i);
  });
});
