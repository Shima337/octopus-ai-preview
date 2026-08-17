import { PLACES, RISK_META, VIDEOS, WARMUP_CARDS, getCase, getPlace, getVideo } from './content.js';
import { createInitialState, transition } from './lesson-state.js';

const app = document.querySelector('#app');
let state = createInitialState();
let previousScreen = null;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function lessonStep(screen) {
  if (['welcome', 'video-intro'].includes(screen)) return 0;
  if (['warmup', 'warmup-result'].includes(screen)) return 1;
  if (screen === 'map') return 2;
  if (screen.startsWith('case') || screen === 'expedition-video') return 3;
  return 4;
}

function chrome(content) {
  const step = lessonStep(state.screen);
  const labels = ['Старт', 'Разминка', 'Карта', 'Экспедиция', 'Щит'];
  return `<main class="lesson-shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">✦</span><span>Карта цифрового мира</span></div>
      <div class="crystal-counter" aria-label="Собрано кристаллов: ${state.crystals.length} из 4"><span aria-hidden="true">💎</span>${state.crystals.length}/4</div>
    </header>
    <nav class="lesson-progress" aria-label="Этапы занятия">${labels.map((label, index) => `<div class="${index < step ? 'done' : ''} ${index === step ? 'active' : ''}"><span>${index < step ? '✓' : index + 1}</span><em>${label}</em></div>`).join('')}</nav>
    ${content}
    <footer>Без регистрации · Без личных данных · Без реальных ссылок</footer>
  </main>`;
}

function renderWelcome() {
  return chrome(`<section class="screen welcome" data-screen="welcome">
    <div class="welcome-copy">
      <p class="eyebrow">Интерактивное путешествие · 25–35 минут</p>
      <h1 tabindex="-1">Построй свою<br><span>цифровую карту</span></h1>
      <p class="lead">Исследуй знакомые места, найди скрытые риски и собери Щит цифрового путешественника.</p>
      <div class="promise-row"><span>🎬 5 видеосцен</span><span>🧩 4 игры</span><span>🗺️ Личная карта</span></div>
      <button class="primary" type="button" data-action="START">Начать путешествие <span aria-hidden="true">→</span></button>
    </div>
    <div class="city-hero" aria-hidden="true">
      <div class="city-core">🧭</div>
      ${PLACES.map((place, index) => `<div class="orbit-place orbit-${index + 1}">${place.icon}</div>`).join('')}
      <div class="orbit-ring ring-one"></div><div class="orbit-ring ring-two"></div>
    </div>
  </section>`);
}

function videoSlot(video, screenName) {
  return chrome(`<section class="screen video-screen" data-screen="${screenName}" data-video-id="${video.id}">
    <div class="video-stage">
      <div class="video-orb" aria-hidden="true"><span>▶</span><i></i><i></i><i></i></div>
      <div class="video-status">Видеослот готов</div>
    </div>
    <div class="video-copy">
      <p class="eyebrow">Будущий ролик · ${escapeHtml(video.duration)}</p>
      <h1 tabindex="-1">${escapeHtml(video.title)}</h1>
      <p class="lead">${escapeHtml(video.goal)}</p>
      <div class="placeholder-note"><span aria-hidden="true">🎞️</span><p><strong>Видео будет добавлено позже.</strong> Все игры уже работают, поэтому занятие можно пройти сейчас.</p></div>
      <button class="primary" type="button" data-action="SKIP_VIDEO">Продолжить без видео <span aria-hidden="true">→</span></button>
    </div>
  </section>`);
}

function renderWarmup() {
  const card = WARMUP_CARDS[state.warmupIndex];
  const feedback = state.warmupFeedback;
  return chrome(`<section class="screen warmup" data-screen="warmup">
    <div class="section-head"><p class="eyebrow">Игра 1 · Карточка ${state.warmupIndex + 1} из ${WARMUP_CARDS.length}</p><h1 tabindex="-1">Что ты замечаешь?</h1><p>Здесь можно не только увидеть опасность, но и решить, что информации пока мало.</p></div>
    <article class="situation-card"><span class="situation-icon" aria-hidden="true">${card.icon}</span><p>${escapeHtml(card.text)}</p></article>
    ${feedback ? `<div class="warmup-feedback ${feedback.correct ? 'correct' : 'think'}" data-warmup-feedback role="status"><span aria-hidden="true">${feedback.correct ? '✨' : '💡'}</span><div><strong>${feedback.correct ? 'Точно!' : 'Хорошая версия'}</strong><p>${escapeHtml(feedback.explanation)}</p></div></div><button class="primary centered" type="button" data-action="NEXT_WARMUP">Следующая карточка <span aria-hidden="true">→</span></button>` : `<div class="answer-grid">
      <button type="button" data-action="WARMUP_ANSWER" data-warmup-answer="safe"><span aria-hidden="true">🌿</span><strong>Похоже, безопасно</strong><small>Ничего странного не видно</small></button>
      <button type="button" data-action="WARMUP_ANSWER" data-warmup-answer="danger"><span aria-hidden="true">⚠️</span><strong>Вижу опасность</strong><small>Лучше остановиться</small></button>
      <button type="button" data-action="WARMUP_ANSWER" data-warmup-answer="check"><span aria-hidden="true">🔎</span><strong>Нужно разобраться</strong><small>Информации пока мало</small></button>
    </div>`}
  </section>`);
}

function renderWarmupResult() {
  const correct = state.warmupAnswers.filter((item) => item.correct).length;
  return chrome(`<section class="screen result-screen" data-screen="warmup-result">
    <div class="reward-glow" aria-hidden="true"></div><div class="crystal-big" aria-hidden="true">👀</div>
    <p class="eyebrow">Первый кристалл найден</p><h1 tabindex="-1">Кристалл внимания</h1>
    <p class="lead centered-text">Ты заметил ${correct} из ${WARMUP_CARDS.length} сигналов. Но главное — научился выбирать «нужно разобраться», когда информации мало.</p>
    <button class="primary centered" type="button" data-action="CONTINUE_WARMUP">Построить свою карту <span aria-hidden="true">→</span></button>
  </section>`);
}

function mapPreview() {
  const selected = state.selectedPlaces.map(getPlace).filter(Boolean);
  return `<div class="map-preview" aria-label="Выбранные цифровые места"><div class="map-core"><span>🧭</span><strong>Моя карта</strong></div>${selected.map((place, index) => `<div class="map-node node-${index + 1}"><span>${place.icon}</span><small>${escapeHtml(place.short)}</small></div>`).join('')}<div class="map-paths" aria-hidden="true"></div></div>`;
}

function renderMap() {
  const cards = PLACES.map((place) => {
    const selected = state.selectedPlaces.includes(place.id);
    return `<button class="place-card ${selected ? 'selected' : ''}" type="button" data-action="TOGGLE_PLACE" data-place-id="${place.id}" aria-pressed="${selected}"><span class="place-icon" aria-hidden="true">${place.icon}</span><span><strong>${escapeHtml(place.title)}</strong><small>${escapeHtml(place.benefit)}</small></span><i aria-hidden="true">${selected ? '✓' : '+'}</i></button>`;
  }).join('');
  const hint = state.mapHintVisible ? '<div class="map-hint" role="status">💡 Выбери хотя бы три места, чтобы карта построила персональную экспедицию.</div>' : '';
  return chrome(`<section class="screen map-screen" data-screen="map">
    <div class="section-head left"><p class="eyebrow">Игра 2 · Конструктор</p><h1 tabindex="-1">Где ты бываешь в интернете?</h1><p>Выбирай только типы мест. Названия аккаунтов, игр и школ нам не нужны.</p></div>
    <div class="map-layout"><div class="place-list">${cards}</div>${mapPreview()}</div>
    ${hint}<div class="map-footer"><span>Выбрано: <strong>${state.selectedPlaces.length}</strong> · нужно минимум 3</span><button class="primary" type="button" data-action="CONFIRM_MAP">Начать экспедицию <span aria-hidden="true">→</span></button></div>
  </section>`);
}

function renderCaseClues() {
  const caseItem = getCase(state.selectedCases[state.caseIndex]);
  const place = getPlace(caseItem.placeId);
  const meta = RISK_META[caseItem.risk];
  const clues = caseItem.clues.map((clue) => {
    const selected = state.selectedClues.includes(clue.id);
    return `<button class="clue ${selected ? 'selected' : ''}" type="button" data-action="TOGGLE_CASE_CLUE" data-clue-id="${clue.id}" aria-pressed="${selected}"><span>${selected ? '✓' : '?'}</span>${escapeHtml(clue.label)}</button>`;
  }).join('');
  return chrome(`<section class="screen case-screen" data-screen="case-clues">
    <div class="case-kicker"><span>${place.icon} ${escapeHtml(place.title)}</span><b>${state.caseIndex + 1}/3</b></div>
    <div class="section-head"><p class="eyebrow">${meta.icon} ${escapeHtml(meta.title)}</p><h1 tabindex="-1">${escapeHtml(caseItem.title)}</h1><p>Найди три сигнала, которые требуют остановиться и подумать.</p></div>
    <div class="case-layout"><article class="message"><header><span>${place.icon}</span><div><strong>${escapeHtml(caseItem.sender)}</strong><small>${escapeHtml(caseItem.status)}</small></div><i>•••</i></header><p>${escapeHtml(caseItem.message)}</p></article><div class="clue-panel"><h2>Что настораживает?</h2><div class="clue-list">${clues}</div>${state.clueHintVisible ? '<div class="map-hint">🔎 Попробуй найти все три важных сигнала.</div>' : ''}<button class="primary wide" type="button" data-action="SUBMIT_CASE_CLUES">Проверить сигналы</button></div></div>
  </section>`);
}

function render() {
  let html;
  if (state.screen === 'welcome') html = renderWelcome();
  else if (state.screen === 'video-intro') html = videoSlot(getVideo('digital-day'), 'video-intro');
  else if (state.screen === 'warmup') html = renderWarmup();
  else if (state.screen === 'warmup-result') html = renderWarmupResult();
  else if (state.screen === 'map') html = renderMap();
  else if (state.screen === 'expedition-video') html = videoSlot(getVideo(getCase(state.selectedCases[state.caseIndex])?.videoId), 'expedition-video');
  else html = renderCaseClues();
  app.innerHTML = html;
  if (previousScreen !== state.screen) window.scrollTo(0, 0);
  previousScreen = state.screen;
  requestAnimationFrame(() => app.querySelector('h1[tabindex="-1"]')?.focus({ preventScroll: true }));
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const payload = { type: control.dataset.action };
  if (control.dataset.warmupAnswer) payload.answer = control.dataset.warmupAnswer;
  if (control.dataset.placeId) payload.placeId = control.dataset.placeId;
  if (control.dataset.clueId) payload.clueId = control.dataset.clueId;
  state = transition(state, payload);
  render();
});

render();
