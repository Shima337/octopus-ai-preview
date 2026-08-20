import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { MediaItem } from '../config/content';
import { track } from '../lib/analytics';

type ReviewGalleryProps = {
  items: MediaItem[];
};

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

const DIALOG_FOCUSABLE_SELECTOR = 'button:not(:disabled), video[controls][tabindex="0"]';

function getDialogFocusableElements(dialog: HTMLDivElement | null): HTMLElement[] {
  return Array.from(dialog?.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR) ?? []);
}

export function ReviewGallery({ items }: ReviewGalleryProps) {
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [failedPreviewIndexes, setFailedPreviewIndexes] = useState<Set<number>>(() => new Set());
  const [visiblePreviewIndexes, setVisiblePreviewIndexes] = useState<Set<number>>(() => new Set());
  const [modalError, setModalError] = useState(false);
  const previewRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const playingPreviewIndexesRef = useRef(new Set<number>());
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const activeReview = useMemo(
    () => items.find((item) => item.id === activeReviewId) ?? null,
    [activeReviewId, items],
  );

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      setVisiblePreviewIndexes((current) => {
        const next = new Set(current);
        entries.forEach((entry) => {
          const index = previewRefs.current.indexOf(entry.target as HTMLVideoElement);
          if (index < 0) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) next.add(index);
          else next.delete(index);
        });
        if (next.size === current.size && [...next].every((index) => current.has(index))) {
          return current;
        }
        return next;
      });
    }, { threshold: 0.2 });

    previewRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    const canPlayPreviews = !activeReview && !reducedMotion && !saveData;

    if (!canPlayPreviews) {
      playingPreviewIndexesRef.current.forEach((index) => previewRefs.current[index]?.pause());
      playingPreviewIndexesRef.current.clear();
      return;
    }

    previewRefs.current.forEach((video, index) => {
      const shouldPlay = visiblePreviewIndexes.has(index) && !failedPreviewIndexes.has(index);
      const isPlaying = playingPreviewIndexesRef.current.has(index);
      if (!shouldPlay && isPlaying) {
        video?.pause();
        playingPreviewIndexesRef.current.delete(index);
        return;
      }
      if (!video || !shouldPlay || isPlaying) return;
      video.muted = true;
      playingPreviewIndexesRef.current.add(index);
      void video.play().catch(() => {
        video.pause();
        playingPreviewIndexesRef.current.delete(index);
      });
    });
  }, [activeReview, failedPreviewIndexes, visiblePreviewIndexes]);

  useEffect(() => () => {
    playingPreviewIndexesRef.current.forEach((index) => previewRefs.current[index]?.pause());
    playingPreviewIndexesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!activeReview) return;

    const previousOverflow = document.body.style.overflow;
    let lastTabDirection: 'forward' | 'backward' = 'forward';
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setActiveReviewId(null);
        return;
      }
      if (event.key === 'Tab') lastTabDirection = event.shiftKey ? 'backward' : 'forward';
    };
    const handleFocusIn = (event: FocusEvent) => {
      const dialog = dialogRef.current;
      if (!dialog || !(event.target instanceof Node) || dialog.contains(event.target)) return;
      const focusableElements = getDialogFocusableElements(dialog);
      const recoveryTarget = lastTabDirection === 'backward'
        ? focusableElements.at(-1)
        : focusableElements[0];
      recoveryTarget?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    const video = modalVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      void video.play().catch(() => video.pause());
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.body.style.overflow = previousOverflow;
      video?.pause();
      video?.removeAttribute('src');
      video?.load();
      openerRef.current?.focus();
    };
  }, [activeReview]);

  const openReview = (item: MediaItem, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setModalError(false);
    playingPreviewIndexesRef.current.forEach((index) => previewRefs.current[index]?.pause());
    playingPreviewIndexesRef.current.clear();
    setActiveReviewId(item.id);
    track({ name: 'review_open', id: item.id });
  };

  const closeReview = () => setActiveReviewId(null);

  const handlePreviewError = (index: number) => {
    previewRefs.current[index]?.pause();
    playingPreviewIndexesRef.current.delete(index);
    setFailedPreviewIndexes((current) => new Set(current).add(index));
  };

  const retryPreview = (index: number) => {
    const video = previewRefs.current[index];
    if (!video) return;

    setFailedPreviewIndexes((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.setAttribute('src', items[index].src);
    video.load();
    video.muted = true;
    playingPreviewIndexesRef.current.add(index);
    void video.play().catch(() => {
      video.pause();
      playingPreviewIndexesRef.current.delete(index);
    });
  };

  const retryModal = () => {
    const video = modalVideoRef.current;
    if (!video || !activeReview) return;

    setModalError(false);
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.setAttribute('src', activeReview.src);
    video.load();
    video.muted = false;
    void video.play().catch(() => video.pause());
  };

  const focusDialogEdge = (edge: 'first' | 'last') => {
    const focusableElements = getDialogFocusableElements(dialogRef.current);
    (edge === 'first' ? focusableElements[0] : focusableElements.at(-1))?.focus();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) closeReview();
  };

  return (
    <div
      className="review-gallery"
      role="region"
      aria-label="Видеоотзывы учеников"
    >
      <ol
        className="review-gallery__track"
        aria-label="Видеоотзывы"
        tabIndex={0}
      >
        {items.map((item, index) => (
          <li key={item.id} className="review-gallery__slide">
            <button
              type="button"
              className="review-gallery__trigger"
              aria-label={`${item.label}. Смотреть со звуком`}
              disabled={failedPreviewIndexes.has(index)}
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
                onError={() => handlePreviewError(index)}
              />
              <span className="review-gallery__play" aria-hidden="true">▶</span>
            </button>
            {failedPreviewIndexes.has(index) && (
              <div className="media-error review-gallery__error">
                <p
                  role="status"
                  aria-label={`${item.label}: ошибка видео. Видеоотзыв не загрузился.`}
                >
                  Видеоотзыв не загрузился.
                </p>
                <button
                  type="button"
                  aria-label={`Повторить загрузку ${item.label.replace(/^Отзыв/u, 'отзыва')}`}
                  onClick={() => retryPreview(index)}
                >
                  Повторить
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      {activeReview && (
        <div
          ref={dialogRef}
          className="review-modal"
          role="dialog"
          aria-modal="true"
          aria-label={activeReview.label}
          onClick={handleBackdropClick}
        >
          <span
            className="review-modal__focus-sentinel"
            tabIndex={0}
            onFocus={() => focusDialogEdge('last')}
          />
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
            <div className="review-modal__media" data-testid="active-review-frame">
              <video
                ref={modalVideoRef}
                className="review-modal__video"
                data-testid="active-review"
                src={activeReview.src}
                poster={activeReview.poster}
                controls
                tabIndex={0}
                playsInline
                preload="metadata"
                muted={false}
                onError={() => setModalError(true)}
                onEnded={() => track({ name: 'review_complete', id: activeReview.id })}
              />
              {modalError && (
                <div className="media-error review-modal__error">
                  <p
                    role="status"
                    aria-label={`${activeReview.label}: ошибка видео. Видеоотзыв не загрузился.`}
                  >
                    Видеоотзыв не загрузился.
                  </p>
                  <button
                    type="button"
                    aria-label={`Повторить загрузку ${activeReview.label.replace(/^Отзыв/u, 'отзыва')}`}
                    onClick={retryModal}
                  >
                    Повторить
                  </button>
                </div>
              )}
            </div>
          </div>
          <span
            className="review-modal__focus-sentinel"
            tabIndex={0}
            onFocus={() => focusDialogEdge('first')}
          />
        </div>
      )}
    </div>
  );
}
