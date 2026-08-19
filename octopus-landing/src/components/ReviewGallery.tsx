import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { MediaItem } from '../config/content';
import { useInViewport } from '../hooks/useInViewport';
import { track } from '../lib/analytics';

type ReviewGalleryProps = {
  items: MediaItem[];
};

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

export function ReviewGallery({ items }: ReviewGalleryProps) {
  const [galleryRef, isInViewport] = useInViewport<HTMLDivElement>();
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const previewRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const playingPreviewIndexesRef = useRef(new Set<number>());
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const activeReview = useMemo(
    () => items.find((item) => item.id === activeReviewId) ?? null,
    [activeReviewId, items],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    const canPlayPreviews = isInViewport && !activeReview && !reducedMotion && !saveData;

    if (!canPlayPreviews) {
      playingPreviewIndexesRef.current.forEach((index) => previewRefs.current[index]?.pause());
      playingPreviewIndexesRef.current.clear();
      return;
    }

    previewRefs.current.forEach((video, index) => {
      if (!video || playingPreviewIndexesRef.current.has(index)) return;
      video.muted = true;
      playingPreviewIndexesRef.current.add(index);
      void video.play().catch(() => {
        video.pause();
        playingPreviewIndexesRef.current.delete(index);
      });
    });
  }, [activeReview, isInViewport]);

  useEffect(() => () => {
    playingPreviewIndexesRef.current.forEach((index) => previewRefs.current[index]?.pause());
    playingPreviewIndexesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!activeReview) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveReviewId(null);
    };
    document.addEventListener('keydown', handleKeyDown);

    const video = modalVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      void video.play().catch(() => video.pause());
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      video?.pause();
      video?.removeAttribute('src');
      video?.load();
      openerRef.current?.focus();
    };
  }, [activeReview]);

  const openReview = (item: MediaItem, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    playingPreviewIndexesRef.current.forEach((index) => previewRefs.current[index]?.pause());
    playingPreviewIndexesRef.current.clear();
    setActiveReviewId(item.id);
    track({ name: 'review_open', id: item.id });
  };

  const closeReview = () => setActiveReviewId(null);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) closeReview();
  };

  return (
    <div ref={galleryRef} className="review-gallery">
      <ol className="review-gallery__list">
        {items.map((item, index) => (
          <li key={item.id} className="review-gallery__item">
            <button
              type="button"
              className="review-gallery__trigger"
              aria-label={`${item.label}. Смотреть со звуком`}
              onClick={(event) => openReview(item, event.currentTarget)}
            >
              <video
                ref={(element) => { previewRefs.current[index] = element; }}
                className="review-gallery__preview"
                src={item.src}
                poster={item.poster}
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
              <span className="review-gallery__play" aria-hidden="true">▶</span>
            </button>
          </li>
        ))}
      </ol>

      {activeReview && (
        <div
          className="review-modal"
          role="dialog"
          aria-modal="true"
          aria-label={activeReview.label}
          onClick={handleBackdropClick}
        >
          <div className="review-modal__panel">
            <button
              type="button"
              className="review-modal__close"
              aria-label="Закрыть видеоотзыв"
              onClick={closeReview}
              autoFocus
            >
              <span aria-hidden="true">×</span>
            </button>
            <video
              ref={modalVideoRef}
              className="review-modal__video"
              data-testid="active-review"
              src={activeReview.src}
              poster={activeReview.poster}
              controls
              playsInline
              preload="metadata"
              muted={false}
              onEnded={() => track({ name: 'review_complete', id: activeReview.id })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
