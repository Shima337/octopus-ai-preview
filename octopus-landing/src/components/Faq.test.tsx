import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Faq } from './Faq';

afterEach(cleanup);

it('opens only the selected answer and reports the FAQ item', () => {
  const listener = vi.fn();
  window.addEventListener('octopus:analytics', listener);
  render(<Faq />);

  const firstQuestion = screen.getByRole('button', {
    name: 'Можно ли полностью подготовиться только с AI?',
  });
  const secondQuestion = screen.getByRole('button', {
    name: 'Как работает бесплатная неделя?',
  });

  fireEvent.click(firstQuestion);
  expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.getByRole('region', { name: 'Можно ли полностью подготовиться только с AI?' }),
  ).toBeInTheDocument();

  fireEvent.click(secondQuestion);
  expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');
  expect(
    screen.queryByRole('region', { name: 'Можно ли полностью подготовиться только с AI?' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('region', { name: 'Как работает бесплатная неделя?' }),
  ).toBeInTheDocument();
  expect(listener).toHaveBeenLastCalledWith(
    expect.objectContaining({ detail: { name: 'faq_open', id: 'free-week' } }),
  );

  window.removeEventListener('octopus:analytics', listener);
});

it('closes an open answer when its question is selected again', () => {
  render(<Faq />);
  const question = screen.getByRole('button', {
    name: 'Что будет, если я не понял тему?',
  });

  fireEvent.click(question);
  fireEvent.click(question);

  expect(question).toHaveAttribute('aria-expanded', 'false');
  expect(
    screen.queryByRole('region', { name: 'Что будет, если я не понял тему?' }),
  ).not.toBeInTheDocument();
});
