/// <reference types="vite/client" />

export type MediaItem = { id: string; src: string; poster: string; label: string };

export type SiteContent = {
  telegramUrl: string;
  liveCourseUrl: string;
  aiPrice: 49;
  livePrice: 199;
  promoDeadline: '2026-08-31';
  teacher: { name: 'Людмила Ершова'; experienceYears: 20; hundredPointStudents: '8+' };
  games: MediaItem[];
  reviews: MediaItem[];
};

export const siteContent: SiteContent = {
  telegramUrl: import.meta.env.VITE_TELEGRAM_BOT_URL ?? '',
  liveCourseUrl: 'https://www.ct-bratan.by/',
  aiPrice: 49,
  livePrice: 199,
  promoDeadline: '2026-08-31',
  teacher: {
    name: 'Людмила Ершова',
    experienceYears: 20,
    hundredPointStudents: '8+',
  },
  games: [
    { id: 'game-01', src: '/media/games/game-01.mp4', poster: '/media/games/game-01.webp', label: 'Игра 1' },
    { id: 'game-02', src: '/media/games/game-02.mp4', poster: '/media/games/game-02.webp', label: 'Игра 2' },
    { id: 'game-03', src: '/media/games/game-03.mp4', poster: '/media/games/game-03.webp', label: 'Игра 3' },
    { id: 'game-04', src: '/media/games/game-04.mp4', poster: '/media/games/game-04.webp', label: 'Игра 4' },
    { id: 'game-05', src: '/media/games/game-05.mp4', poster: '/media/games/game-05.webp', label: 'Игра 5' },
  ],
  reviews: [
    { id: 'review-01', src: '/media/reviews/review-01.mp4', poster: '/media/reviews/review-01.webp', label: 'Отзыв 1' },
    { id: 'review-02', src: '/media/reviews/review-02.mp4', poster: '/media/reviews/review-02.webp', label: 'Отзыв 2' },
    { id: 'review-03', src: '/media/reviews/review-03.mp4', poster: '/media/reviews/review-03.webp', label: 'Отзыв 3' },
    { id: 'review-04', src: '/media/reviews/review-04.mp4', poster: '/media/reviews/review-04.webp', label: 'Отзыв 4' },
    { id: 'review-05', src: '/media/reviews/review-05.mp4', poster: '/media/reviews/review-05.webp', label: 'Отзыв 5' },
    { id: 'review-06', src: '/media/reviews/review-06.mp4', poster: '/media/reviews/review-06.webp', label: 'Отзыв 6' },
    { id: 'review-07', src: '/media/reviews/review-07.mp4', poster: '/media/reviews/review-07.webp', label: 'Отзыв 7' },
  ],
};
