import { useEffect, useRef, useState, type UIEvent } from 'react';
import type { MediaItem } from '../config/content';
import { useInViewport } from '../hooks/useInViewport';
import { track } from '../lib/analytics';

type MediaCarouselProps = {
  items: MediaItem[];
  ariaLabel: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

export function MediaCarousel({ items, ariaLabel }: MediaCarouselProps) {
  const [regionRef, isInViewport] = useInViewport<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const slideRefs = useRef<Array<HTMLLIElement | null>>([]);
  const playingIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    const canPlay = isInViewport && !reducedMotion && !saveData;
    const playingIndex = playingIndexRef.current;

    if (playingIndex !== null && (playingIndex !== activeIndex || !canPlay)) {
      videoRefs.current[playingIndex]?.pause();
      playingIndexRef.current = null;
    }

    if (!canPlay || playingIndexRef.current === activeIndex) return;

    const video = videoRefs.current[activeIndex];
    if (!video) return;

    playingIndexRef.current = activeIndex;
    void video.play().catch(() => {
      video.pause();
      if (playingIndexRef.current === activeIndex) playingIndexRef.current = null;
    });
  }, [activeIndex, isInViewport]);

  useEffect(() => () => {
    const playingIndex = playingIndexRef.current;
    if (playingIndex !== null) videoRefs.current[playingIndex]?.pause();
  }, []);

  const moveTo = (nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, items.length - 1));
    if (boundedIndex === activeIndexRef.current) return;

    activeIndexRef.current = boundedIndex;
    setActiveIndex(boundedIndex);
    slideRefs.current[boundedIndex]?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
    track({ name: 'game_slide_change', id: items[boundedIndex].id });
  };

  const handleScroll = (event: UIEvent<HTMLOListElement>) => {
    const scrollTrack = event.currentTarget;
    const viewportCenter = scrollTrack.scrollLeft + scrollTrack.clientWidth / 2;
    let nearestIndex = activeIndexRef.current;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex === activeIndexRef.current) return;
    activeIndexRef.current = nearestIndex;
    setActiveIndex(nearestIndex);
    track({ name: 'game_slide_change', id: items[nearestIndex].id });
  };

  return (
    <div ref={regionRef} className="media-carousel" role="region" aria-label={ariaLabel}>
      <ol className="media-carousel__track" onScroll={handleScroll}>
        {items.map((item, index) => (
          <li
            className="media-carousel__slide"
            key={item.id}
            ref={(element) => { slideRefs.current[index] = element; }}
            aria-label={`${index + 1} из ${items.length}: ${item.label}`}
          >
            <video
              ref={(element) => { videoRefs.current[index] = element; }}
              aria-label={item.label}
              src={item.src}
              poster={item.poster}
              muted
              loop
              playsInline
              preload={index === 0 ? 'metadata' : 'none'}
            />
            <p>{item.label}</p>
          </li>
        ))}
      </ol>

      <div className="media-carousel__controls">
        <button
          type="button"
          onClick={() => moveTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Предыдущая игра"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className="media-carousel__counter" aria-live="polite">
          {items.length === 0 ? '0 / 0' : `${activeIndex + 1} / ${items.length}`}
        </span>
        <button
          type="button"
          onClick={() => moveTo(activeIndex + 1)}
          disabled={activeIndex >= items.length - 1}
          aria-label="Следующая игра"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
