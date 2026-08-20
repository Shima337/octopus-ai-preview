import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Faq } from '../components/Faq';
import { Pricing } from './Pricing';

it('shows the active promotion and hides it after the deadline', () => {
  const { rerender } = render(<Pricing now={new Date('2026-08-31T20:59:59Z')} />);
  expect(screen.getByText(/вместо 248 BYN/i)).toBeInTheDocument();

  rerender(<Pricing now={new Date('2026-08-31T21:00:00Z')} />);
  expect(screen.queryByText(/вместо 248 BYN/i)).not.toBeInTheDocument();
});

it('renders six closed FAQ controls', () => {
  render(<Faq />);
  const buttons = screen.getAllByRole('button');

  expect(buttons).toHaveLength(6);
  buttons.forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'));
});
