import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaCarousel } from './MediaCarousel';

const items = [1, 2, 3].map((n) => ({
  id: `g${n}`,
  src: `/g${n}.mp4`,
  poster: `/g${n}.webp`,
  label: `Игра ${n}`,
}));

let observerCallback: IntersectionObserverCallback;

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn((callback: IntersectionObserverCallback) => {
      observerCallback = callback;
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        root: null,
        rootMargin: '0px',
        thresholds: [0.2],
        takeRecords: vi.fn(() => []),
      };
    }),
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('exposes labelled navigation and muted inline videos', () => {
  render(<MediaCarousel items={items} ariaLabel="Игры по правилам" />);
  expect(screen.getByRole('region', { name: 'Игры по правилам' })).toBeInTheDocument();
  const videos = document.querySelectorAll('video');
  expect(videos).toHaveLength(3);
  videos.forEach((video) => {
    expect(video).toHaveProperty('muted', true);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('poster');
  });

  fireEvent.click(screen.getByRole('button', { name: /следующая/i }));
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /предыдущая/i }));
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
});

it('does not touch media playback before the carousel becomes visible', () => {
  render(<MediaCarousel items={items} ariaLabel="Игры" />);

  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
});

it('updates the active counter after native horizontal scrolling', () => {
  render(<MediaCarousel items={items} ariaLabel="Игры" />);
  const track = screen.getByRole('list');
  const slides = screen.getAllByRole('listitem');

  Object.defineProperty(track, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 100, writable: true });
  slides.forEach((slide, index) => {
    Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: index * 100 });
    Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 100 });
  });

  fireEvent.scroll(track);

  expect(screen.getByText('2 / 3')).toBeInTheDocument();
});

it('plays only the active video while visible and tracks slide changes', async () => {
  const analytics = vi.fn();
  window.addEventListener('octopus:analytics', analytics);
  render(<MediaCarousel items={items} ariaLabel="Игры" />);
  const videos = Array.from(document.querySelectorAll('video'));
  videos.forEach((video) => {
    Object.defineProperty(video, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(video, 'pause', { configurable: true, value: vi.fn() });
  });

  await act(async () => {
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

  expect(videos[0].play).toHaveBeenCalledOnce();
  expect(videos[1].play).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /следующая/i }));
  expect(videos[0].pause).toHaveBeenCalled();
  expect(videos[1].play).toHaveBeenCalledOnce();
  expect(analytics).toHaveBeenCalledOnce();
  expect((analytics.mock.calls[0][0] as CustomEvent).detail).toEqual({ name: 'game_slide_change', id: 'g2' });

  window.removeEventListener('octopus:analytics', analytics);
});

it('does not autoplay when reduced motion is requested or data saver is enabled', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: true },
  });
  render(<MediaCarousel items={items} ariaLabel="Игры" />);

  await act(async () => {
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

  document.querySelectorAll('video').forEach((video) => expect(video.play).not.toHaveBeenCalled());
});
