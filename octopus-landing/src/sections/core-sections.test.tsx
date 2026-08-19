import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Hero } from './Hero';
import { TopicJourney } from './TopicJourney';
import { AiProof } from './AiProof';

afterEach(cleanup);

it('shows price, free access, and Lyudmila authority in the opening proof', () => {
  render(<Hero cta={<a href="https://t.me/test_bot">Пройти тему бесплатно</a>} />);
  expect(screen.getByText(/49 BYN/)).toBeInTheDocument();
  expect(screen.getByText(/7 дней полного доступа/)).toBeInTheDocument();
  expect(screen.getByText(/автор методики.*Людмила Ершова.*20 лет/i)).toBeInTheDocument();
});

it('renders all five topic meanings and all supported answer formats', () => {
  render(<><TopicJourney /><AiProof /></>);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByRole('heading', { name: /видеообъяснение/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /личная практика с AI/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /игра по правилу/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /тест по теме/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /следующий уровень/i })).toBeInTheDocument();
  expect(screen.getByText(/2–3 минуты/i)).toBeInTheDocument();
  expect(screen.getByText(/после успеха открывается новая тема.*ошибки.*вернёт/i)).toBeInTheDocument();
  expect(screen.getByText(/^Текст$/)).toBeInTheDocument();
  expect(screen.getByText(/^Варианты ответа$/)).toBeInTheDocument();
  expect(screen.getByText(/^Голос$/)).toBeInTheDocument();
});

it('diagnoses the error, gives extra practice, checks it, and only then progresses', () => {
  render(<AiProof />);
  expect(screen.getByText(/доводит до понимания/i)).toBeInTheDocument();
  expect(screen.getByText(/безударная.*значение корня/i)).toBeInTheDocument();
  expect(screen.getByText(/дополнительное задание/i)).toBeInTheDocument();
  expect(screen.getByText(/посвятить время учёбе.*связано со светом/i)).toBeInTheDocument();
  expect(screen.getByText(/ответ проверен.*переходить к следующей теме/i)).toBeInTheDocument();

  const transcript = screen.getByLabelText(/пример диалога/i).textContent ?? '';
  expect(transcript.indexOf('Дополнительное задание')).toBeLessThan(transcript.indexOf('Ответ проверен'));
});
