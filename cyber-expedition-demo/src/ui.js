import { getMediaModel } from './media.js';

const PREVIEW_STAGES = [
  ['home', 'Домой'],
  ['map', 'Карта'],
  ['mirror', 'Зеркало'],
  ['locks', 'Замки'],
  ['traps', 'Ловушки'],
  ['chat', 'Чат'],
  ['voice', 'Голос'],
  ['card', 'Карточка'],
];

const SCREEN_TITLES = {
  'mirror-video': 'Зеркальный сад',
  mirror: 'Зеркальный сад',
  'locks-video': 'Замок секретов',
  locks: 'Замок секретов',
  'traps-video': 'Ярмарка ловушек',
  traps: 'Ярмарка ловушек',
  chat: 'Станция общения',
  'voice-prepare': 'Голосовая тренировка',
  'voice-live': 'Голосовая тренировка',
  'voice-result': 'Итог тренировки',
  reward: 'Деталь щита найдена!',
  'safety-card': 'Моя карточка безопасности',
};

export function renderShell(state, content) {
  const screen = renderScreen(state, content);
  const completed = state.completedDistricts.length;
  const reviewerNavigation = state.mode === 'preview' ? renderPreviewNavigation(state) : '';

  return `
    <div class="lesson-shell">
      <header class="topbar">
        <a class="brand" href="#main-content" aria-label="Киберэкспедиция: к уроку">
          <span aria-hidden="true">🛡️</span> Киберэкспедиция
        </a>
        ${state.mode ? `<p class="progress" aria-label="Прогресс: ${completed} из ${content.districts.length} районов">
          <span aria-hidden="true">${'●'.repeat(completed)}${'○'.repeat(content.districts.length - completed)}</span>
          <span>${completed}/${content.districts.length}</span>
        </p>` : ''}
      </header>
      ${reviewerNavigation}
      <main id="main-content" tabindex="-1">${screen}</main>
    </div>
  `;
}

export function renderWelcome() {
  return `
    <section class="welcome" data-screen="welcome">
      <div class="welcome__copy">
        <p class="eyebrow">Маршрут по городу цифровых секретов</p>
        <h1>Собери киберщит!</h1>
        <p class="lead">Пройди четыре района, разгадай задачи и узнай, как смело и безопасно действовать в сети.</p>
        <div class="start-actions" aria-label="Выбор режима">
          <button class="button button--primary" type="button" data-action="CHOOSE_CHILD_MODE">
            Начать экспедицию <span aria-hidden="true">→</span>
          </button>
          <button class="button button--quiet" type="button" data-action="CHOOSE_PREVIEW_MODE">
            Режим просмотра для взрослого
          </button>
        </div>
      </div>
      <div class="welcome__art" aria-hidden="true">
        <span class="hero-shield">🛡️</span><span class="hero-star">✦</span>
      </div>
    </section>
  `;
}

export function renderMap(state, districts) {
  const cards = districts.map((district, index) => {
    const isUnlocked = state.unlockedDistricts.includes(district.id);
    const isComplete = state.completedDistricts.includes(district.id);
    const status = isComplete ? 'Пройдено' : isUnlocked ? 'Можно входить' : 'Снача пройди предыдущий район';
    return `
      <li class="map-route__stop map-route__stop--${escapeHtml(district.theme)}">
        <button class="district-card${isUnlocked ? '' : ' district-card--locked'}${isComplete ? ' district-card--complete' : ''}"
          type="button" data-action="OPEN_DISTRICT" data-district-id="${escapeHtml(district.id)}"
          ${isUnlocked ? '' : 'disabled'} aria-describedby="district-status-${index}">
          <span class="district-card__number" aria-hidden="true">${index + 1}</span>
          <span class="district-card__icon" aria-hidden="true">${district.icon}</span>
          <strong>${escapeHtml(district.title)}</strong>
          <span id="district-status-${index}" class="district-card__status">${status}</span>
        </button>
      </li>`;
  }).join('');

  return `
    <section class="map-screen" data-screen="map">
      <p class="eyebrow">Твой маршрут</p>
      <h1>Карта кибергорода</h1>
      <p class="lead">Начни с первого района. За каждую победу ты получишь деталь защитного щита.</p>
      <ol class="map-route">${cards}</ol>
    </section>
  `;
}

export function renderMediaSlot(state, video) {
  const media = getMediaModel(video);
  const heading = state.screen === 'intro-video' ? 'Добро пожаловать в кибергород!' : SCREEN_TITLES[state.screen] ?? 'Видеозадание';

  if (media.mode === 'video' && media.captions) {
    return `
      <section class="media-screen" data-screen="${escapeHtml(state.screen)}">
        <p class="eyebrow">Короткая история</p>
        <h1>${escapeHtml(heading)}</h1>
        <video class="media-player" controls playsinline preload="metadata"${media.poster ? ` poster="${escapeHtml(media.poster)}"` : ''}>
          <source src="${escapeHtml(media.source)}">
          <track kind="captions" srclang="ru" label="Русские субтитры" src="${escapeHtml(media.captions)}" default>
          Браузер не умеет показывать видео.
        </video>
        ${renderSkipButton()}
      </section>`;
  }

  return `
    <section class="media-screen" data-screen="${escapeHtml(state.screen)}">
      <p class="eyebrow">Перед стартом</p>
      <h1>${escapeHtml(heading)}</h1>
      <div class="media-placeholder" data-media-mode="placeholder" role="img" aria-label="Иллюстрация: щит защищает кибергород">
        <span class="media-placeholder__sky" aria-hidden="true">☁️ ✦ ☁️</span>
        <span class="media-placeholder__shield" aria-hidden="true">🛡️</span>
        <p><strong>Видео ещё готовится.</strong><br>Можно сразу перейти к экспедиции — все задания будут работать.</p>
      </div>
      ${renderSkipButton()}
    </section>`;
}

function renderScreen(state, content) {
  if (state.screen === 'welcome') return renderWelcome(state);
  if (state.screen === 'map') return renderMap(state, content.districts);
  const video = videoForScreen(state.screen, content.videos);
  if (video) return renderMediaSlot(state, video);

  return `
    <section class="chapter-placeholder" data-screen="${escapeHtml(state.screen)}">
      <p class="eyebrow">Экран маршрута</p>
      <h1>${escapeHtml(SCREEN_TITLES[state.screen] ?? 'Киберэкспедиция')}</h1>
      <p class="lead">Этот этап можно открыть из панели просмотра.</p>
    </section>`;
}

function videoForScreen(screen, videos) {
  const ids = {
    'intro-video': 'city-intro',
    'mirror-video': 'mirror-post',
    'locks-video': 'secret-locks',
    'traps-video': 'trick-market',
  };
  return videos.find((video) => video.id === ids[screen]) ?? null;
}

function renderPreviewNavigation(state) {
  const links = PREVIEW_STAGES.map(([stage, label]) => `
    <button type="button" data-action="JUMP_TO_PREVIEW" data-preview-stage="${stage}"
      ${previewStageForScreen(state.screen) === stage ? 'aria-current="page"' : ''}>${label}</button>`).join('');
  return `<nav class="preview-nav" aria-label="Переход к экранам для просмотра"><span>Просмотр:</span>${links}</nav>`;
}

function previewStageForScreen(screen) {
  if (screen === 'welcome') return 'home';
  if (screen === 'map') return 'map';
  if (screen.startsWith('mirror')) return 'mirror';
  if (screen.startsWith('locks')) return 'locks';
  if (screen.startsWith('traps')) return 'traps';
  if (screen === 'chat') return 'chat';
  if (screen.startsWith('voice')) return 'voice';
  if (screen === 'safety-card') return 'card';
  return null;
}

function renderSkipButton() {
  return `<button class="button button--primary media-skip" type="button" data-action="SKIP_MEDIA">Продолжить без видео <span aria-hidden="true">→</span></button>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
