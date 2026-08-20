/// <reference types="vite/client" />

export type MediaItem = { id: string; src: string; poster: string; label: string };
export type FaqItem = { id: string; question: string; answer: string };

export type SiteContent = {
  telegramUrl: string;
  liveCourseUrl: string;
  aiPrice: 49;
  livePrice: 199;
  promoDeadline: '2026-08-31';
  liveCoursePromo: 'AI включён до 31 августа — 199 BYN вместо 248 BYN';
  teacher: { name: 'Людмила Ершова'; experienceYears: 20; hundredPointStudents: '8+' };
  faq: FaqItem[];
  games: MediaItem[];
  reviews: MediaItem[];
};

export const siteContent: SiteContent = {
  telegramUrl: import.meta.env.VITE_TELEGRAM_BOT_URL ?? '',
  liveCourseUrl: 'https://www.ct-bratan.by/',
  aiPrice: 49,
  livePrice: 199,
  promoDeadline: '2026-08-31',
  liveCoursePromo: 'AI включён до 31 августа — 199 BYN вместо 248 BYN',
  teacher: {
    name: 'Людмила Ершова',
    experienceYears: 20,
    hundredPointStudents: '8+',
  },
  faq: [
    {
      id: 'ai-only',
      question: 'Можно ли полностью подготовиться только с AI?',
      answer: 'Да. AI объяснит каждую тему, даст личную практику и проверит твои ответы.',
    },
    {
      id: 'free-week',
      question: 'Как работает бесплатная неделя?',
      answer: 'После запуска в Telegram ты получишь 7 дней полного доступа. Сегодня платить не нужно.',
    },
    {
      id: 'topic-help',
      question: 'Что будет, если я не понял тему?',
      answer: 'Задай дополнительный вопрос: AI объяснит иначе и даст новую практику.',
    },
    {
      id: 'level',
      question: 'Подойдёт ли курс при низком или уже высоком балле?',
      answer: 'Да. Можно закрыть пробелы с основ или сразу отрабатывать сложные темы.',
    },
    {
      id: 'games',
      question: 'Игры — это просто развлечение?',
      answer: 'Нет. Каждая игра закрепляет тему и тренирует задания формата ЦЭ/ЦТ.',
    },
    {
      id: 'live-course',
      question: 'Можно ли заниматься вживую с Людмилой?',
      answer: 'Да. Живой курс с Людмилой стоит 199 BYN в месяц; подробности есть на сайте курса.',
    },
  ],
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
