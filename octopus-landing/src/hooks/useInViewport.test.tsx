import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInViewport } from './useInViewport';

type ObserverCallback = IntersectionObserverCallback;

let observerCallback: ObserverCallback;
const disconnect = vi.fn();

function Probe() {
  const [ref, isInViewport] = useInViewport<HTMLDivElement>();

  return (
    <div ref={ref} data-testid="probe">
      {isInViewport ? 'visible' : 'hidden'}
    </div>
  );
}

beforeEach(() => {
  disconnect.mockClear();
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn((callback: ObserverCallback, options?: IntersectionObserverInit) => {
      observerCallback = callback;
      expect(options).toEqual({ threshold: 0.2 });

      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect,
        root: null,
        rootMargin: '0px',
        thresholds: [0.2],
        takeRecords: vi.fn(() => []),
      };
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('reports visibility at the 20 percent intersection threshold', () => {
  render(<Probe />);
  const probe = screen.getByTestId('probe');
  expect(probe).toHaveTextContent('hidden');

  act(() => {
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });

  expect(probe).toHaveTextContent('visible');
});

it('disconnects the observer when its element unmounts', () => {
  const { unmount } = render(<Probe />);
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});
