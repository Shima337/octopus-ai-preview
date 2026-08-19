import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Hero } from './Hero';
import { TopicJourney } from './TopicJourney';
import { AiProof } from './AiProof';

it('shows price, free access, and teacher authority in the hero', () => {
  render(<Hero cta={<a href="https://t.me/test_bot">Пройти тему бесплатно</a>} />);
  expect(screen.getByText(/49 BYN/)).toBeInTheDocument();
  expect(screen.getByText(/7 дней полного доступа/)).toBeInTheDocument();
  expect(screen.getByText(/20 лет/)).toBeInTheDocument();
});

it('renders all five topic stages and corrective AI behavior', () => {
  render(<><TopicJourney /><AiProof /></>);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByText(/доводит до понимания/i)).toBeInTheDocument();
});
