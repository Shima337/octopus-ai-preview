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
  { id: 'city-intro', source: null, poster: null, captions: null, audio: null },
  { id: 'mirror-post', source: null, poster: null, captions: null, audio: null },
  { id: 'secret-locks', source: null, poster: null, captions: null, audio: null },
  { id: 'trick-market', source: null, poster: null, captions: null, audio: null },
  { id: 'message-station', source: null, poster: null, captions: null, audio: null },
];

export const SAFETY_RULES = [
  { id: 'pause', label: 'Остановлюсь и не буду спешить' },
  { id: 'personal', label: 'Не покажу адрес, школу или телефон' },
  { id: 'secret', label: 'Не сообщу пароль или код подтверждения' },
  { id: 'check', label: 'Проверю странное сообщение другим способом' },
  { id: 'adult', label: 'Покажу ситуацию взрослому' },
];

export const TRUSTED_ADULT_ROLES = [
  { id: 'mother', label: 'Мама' }, { id: 'father', label: 'Папа' },
  { id: 'relative', label: 'Другой родственник' }, { id: 'teacher', label: 'Учитель' },
  { id: 'trusted-adult', label: 'Другой взрослый, которому доверяю' },
];

export const HABITS = [
  { id: 'check-photo', label: 'Проверю фото со взрослым перед публикацией' },
  { id: 'pause-before-click', label: 'Остановлюсь перед неожиданной ссылкой' },
  { id: 'keep-codes-secret', label: 'Не буду пересылать пароли и коды' },
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
