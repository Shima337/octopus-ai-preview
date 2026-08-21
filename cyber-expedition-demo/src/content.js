export const DISTRICTS = [
  { id: 'mirror', title: 'Зеркальный сад', icon: '🪞', partId: 'privacy', theme: 'aqua' },
  { id: 'locks', title: 'Замок секретов', icon: '🔐', partId: 'secret', theme: 'gold' },
  { id: 'traps', title: 'Ярмарка ловушек', icon: '🔎', partId: 'check', theme: 'violet' },
  { id: 'messages', title: 'Станция общения', icon: '💬', partId: 'help', theme: 'coral' },
];

export const SHIELD_PARTS = [
  { id: 'privacy', label: 'Личные данные' },
  { id: 'secret', label: 'Секретный ключ' },
  { id: 'check', label: 'Проверка' },
  { id: 'help', label: 'Помощь' },
];

export const VIDEOS = [
  {
    id: 'city-intro',
    source: './media/city-intro.mp4',
    poster: null,
    captions: './media/city-intro.ru.vtt',
    audio: null,
  },
  { id: 'mirror-post', source: null, poster: null, captions: null, audio: null },
  { id: 'secret-locks', source: null, poster: null, captions: null, audio: null },
  { id: 'trick-market', source: null, poster: null, captions: null, audio: null },
  { id: 'message-station', source: null, poster: null, captions: null, audio: null },
];

export function getDistrict(id) {
  return DISTRICTS.find((district) => district.id === id) ?? null;
}

export function getVideo(id) {
  return VIDEOS.find((video) => video.id === id) ?? null;
}

export function getShieldPart(id) {
  return SHIELD_PARTS.find((part) => part.id === id) ?? null;
}
