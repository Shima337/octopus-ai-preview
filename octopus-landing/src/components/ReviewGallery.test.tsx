import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReviewGallery } from './ReviewGallery';

const items = [1, 2].map((n) => ({
  id: `r${n}`,
  src: `/r${n}.mp4`,
  poster: `/r${n}.webp`,
  label: `Отзыв ученика ${n}`,
}));

let observerCallback: IntersectionObserverCallback;

function createIntersectionEntry(
  target: HTMLVideoElement,
  isIntersecting: boolean,
): IntersectionObserverEntry {
  const bounds = target.getBoundingClientRect();
  return {
    time: 0,
    target,
    rootBounds: null,
    boundingClientRect: bounds,
    intersectionRect: isIntersecting ? bounds : new DOMRectReadOnly(),
    isIntersecting,
    intersectionRatio: isIntersecting ? 1 : 0,
  };
}

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
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

afterEach(() => {
  document.body.style.overflow = '';
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('keeps previews muted and opens one labelled sound modal', () => {
  render(<ReviewGallery items={items} />);
  document.querySelectorAll('video').forEach((video) => expect(video).toHaveProperty('muted', true));
  fireEvent.click(screen.getByRole('button', { name: /отзыв ученика 1/i }));
  expect(screen.getByRole('dialog', { name: /отзыв ученика 1/i })).toBeInTheDocument();
  expect(screen.getByTestId('active-review')).toHaveProperty('muted', false);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('does not touch preview playback before the gallery becomes visible', () => {
  render(<ReviewGallery items={items} />);

  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
});

it('exposes a focusable horizontal review track with slide items', () => {
  render(<ReviewGallery items={items} />);
  const gallery = screen.getByRole('region', { name: /видеоотзывы учеников/i });
  const track = within(gallery).getByRole('list', { name: /видеоотзывы/i });

  expect(track).toHaveClass('review-gallery__track');
  expect(track).toHaveAttribute('tabindex', '0');
  within(track).getAllByRole('listitem').forEach((slide) => {
    expect(slide).toHaveClass('review-gallery__slide');
  });
});

it('plays muted previews only while visible and pauses them for the sound modal', async () => {
  render(<ReviewGallery items={items} />);
  const previews = Array.from(document.querySelectorAll<HTMLVideoElement>('.review-gallery__preview'));
  previews.forEach((video) => {
    Object.defineProperty(video, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(video, 'pause', { configurable: true, value: vi.fn() });
  });

  await act(async () => {
    observerCallback([
      createIntersectionEntry(previews[0], true),
      createIntersectionEntry(previews[1], false),
    ], {} as IntersectionObserver);
  });
  expect(previews[0].play).toHaveBeenCalledOnce();
  expect(previews[1].play).not.toHaveBeenCalled();

  await act(async () => {
    observerCallback([
      createIntersectionEntry(previews[0], false),
      createIntersectionEntry(previews[1], true),
    ], {} as IntersectionObserver);
  });
  expect(previews[0].pause).toHaveBeenCalledOnce();
  expect(previews[1].play).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: /отзыв ученика 1/i }));
  expect(previews[1].pause).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: /закрыть видеоотзыв/i }));
  expect(previews[0].play).toHaveBeenCalledOnce();
  expect(previews[1].play).toHaveBeenCalledTimes(2);
});

it('retains a review poster and exposes a real retry after a preview error', () => {
  render(<ReviewGallery items={items} />);
  const firstPreview = document.querySelector<HTMLVideoElement>('.review-gallery__preview')!;
  const load = vi.fn();
  const play = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(firstPreview, 'load', { configurable: true, value: load });
  Object.defineProperty(firstPreview, 'play', { configurable: true, value: play });

  fireEvent.error(firstPreview);

  expect(firstPreview).toHaveAttribute('poster', '/r1.webp');
  expect(screen.getByRole('status')).toHaveTextContent('Видеоотзыв не загрузился.');
  fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку отзыва ученика 1' }));

  expect(load).toHaveBeenCalledTimes(2);
  expect(firstPreview).toHaveAttribute('src', '/r1.mp4');
  expect(play).toHaveBeenCalledOnce();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('retains the modal poster and retries active review playback after an error', () => {
  render(<ReviewGallery items={items} />);
  fireEvent.click(screen.getByRole('button', { name: /отзыв ученика 1/i }));
  const dialog = screen.getByRole('dialog', { name: /отзыв ученика 1/i });
  const modalVideo = within(dialog).getByTestId('active-review');
  const load = vi.fn();
  const play = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(modalVideo, 'load', { configurable: true, value: load });
  Object.defineProperty(modalVideo, 'play', { configurable: true, value: play });

  fireEvent.error(modalVideo);

  expect(modalVideo).toHaveAttribute('poster', '/r1.webp');
  expect(within(dialog).getByRole('status')).toHaveTextContent('Видеоотзыв не загрузился.');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Повторить загрузку отзыва ученика 1' }));

  expect(load).toHaveBeenCalledTimes(2);
  expect(modalVideo).toHaveAttribute('src', '/r1.mp4');
  expect(play).toHaveBeenCalledOnce();
  expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
});

it('tracks opening and completion while restoring focus and page scrolling', () => {
  const analytics = vi.fn();
  window.addEventListener('octopus:analytics', analytics);
  render(<ReviewGallery items={items} />);
  const opener = screen.getByRole('button', { name: /отзыв ученика 1/i });

  opener.focus();
  fireEvent.click(opener);
  expect(document.body).toHaveStyle({ overflow: 'hidden' });
  expect((analytics.mock.calls[0][0] as CustomEvent).detail).toEqual({ name: 'review_open', id: 'r1' });

  fireEvent.ended(screen.getByTestId('active-review'));
  expect((analytics.mock.calls[1][0] as CustomEvent).detail).toEqual({ name: 'review_complete', id: 'r1' });

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(document.body.style.overflow).toBe('');
  expect(opener).toHaveFocus();
  window.removeEventListener('octopus:analytics', analytics);
});

it('contains escaped focus without intercepting native video-control traversal', () => {
  render(<ReviewGallery items={items} />);
  const opener = screen.getByRole('button', { name: /отзыв ученика 1/i });
  fireEvent.click(opener);
  const closeButton = screen.getByRole('button', { name: /закрыть видеоотзыв/i });
  const modalVideo = screen.getByTestId('active-review');

  expect(closeButton).toHaveFocus();
  const forwardTab = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  });
  modalVideo.focus();
  modalVideo.dispatchEvent(forwardTab);
  expect(forwardTab.defaultPrevented).toBe(false);
  expect(modalVideo).toHaveFocus();

  opener.focus();
  expect(closeButton).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  opener.focus();
  expect(modalVideo).toHaveFocus();
});

it('places the active video inside the circular modal media frame', () => {
  render(<ReviewGallery items={items} />);
  fireEvent.click(screen.getByRole('button', { name: /отзыв ученика 1/i }));
  const activeVideo = screen.getByTestId('active-review');
  const mediaFrame = screen.getByTestId('active-review-frame');

  expect(mediaFrame).toHaveClass('review-modal__media');
  expect(mediaFrame).toContainElement(activeVideo);
  expect(activeVideo).toHaveClass('review-modal__video');
});

it('closes only when the modal backdrop itself is clicked', () => {
  render(<ReviewGallery items={items} />);
  fireEvent.click(screen.getByRole('button', { name: /отзыв ученика 1/i }));
  const dialog = screen.getByRole('dialog');

  fireEvent.click(screen.getByTestId('active-review'));
  expect(dialog).toBeInTheDocument();
  fireEvent.click(dialog);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
