import { PLACES, RISK_META, SHIELD_STEPS, WARMUP_CARDS, getCase, getPlace, getVideo } from './content.js';
import { createInitialState, transition } from './lesson-state.js';
import { loadLesson, resetLesson, saveLesson } from './storage.js';
import { getVideoModel } from './video.js';

const app = document.querySelector('#app');
let state = loadLesson();
let previousScreen = null;
let restartPanelOpen = false;

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
  const model = getVideoModel(video);
  const media = model.mode === 'player'
    ? `<video class="video-player" controls preload="metadata"><source src="${escapeHtml(model.source)}">${model.captions ? `<track kind="captions" srclang="ru" label="Русские субтитры" src="${escapeHtml(model.captions)}" default>` : ''}</video>`
    : `<div class="video-orb" aria-hidden="true"><span>▶</span><i></i><i></i><i></i></div><div class="video-status">Видеослот готов</div>`;
  return chrome(`<section class="screen video-screen" data-screen="${screenName}" data-video-id="${video.id}">
    <div class="video-stage">${media}</div>
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
  return chrome(`<section class="screen case-screen" data-screen="case-clues" data-case-id="${caseItem.id}">
    <div class="case-kicker"><span>${place.icon} ${escapeHtml(place.title)}</span><b>${state.caseIndex + 1}/3</b></div>
    <div class="section-head"><p class="eyebrow">${meta.icon} ${escapeHtml(meta.title)}</p><h1 tabindex="-1">${escapeHtml(caseItem.title)}</h1><p>Найди три сигнала, которые требуют остановиться и подумать.</p></div>
    <div class="case-layout"><article class="message"><header><span>${place.icon}</span><div><strong>${escapeHtml(caseItem.sender)}</strong><small>${escapeHtml(caseItem.status)}</small></div><i>•••</i></header><p>${escapeHtml(caseItem.message)}</p></article><div class="clue-panel"><h2>Что настораживает?</h2><div class="clue-list">${clues}</div>${state.clueHintVisible ? '<div class="map-hint">🔎 Попробуй найти все три важных сигнала.</div>' : ''}<button class="primary wide" type="button" data-action="SUBMIT_CASE_CLUES">Проверить сигналы</button></div></div>
  </section>`);
}

function renderCaseDecision() {
  const caseItem = getCase(state.selectedCases[state.caseIndex]);
  const place = getPlace(caseItem.placeId);
  const meta = RISK_META[caseItem.risk];
  const actions = caseItem.actions.map((action) => `<button class="decision-card" type="button" data-action="CHOOSE_CASE_ACTION" data-action-id="${action.id}"><span aria-hidden="true">${action.icon}</span><strong>${escapeHtml(action.label)}</strong><i aria-hidden="true">→</i></button>`).join('');
  return chrome(`<section class="screen decision-screen" data-screen="case-decision" data-case-id="${caseItem.id}">
    <div class="case-kicker"><span>${place.icon} ${escapeHtml(place.title)}</span><b>${state.caseIndex + 1}/3</b></div>
    <div class="decision-layout"><div><p class="eyebrow">${meta.icon} Решение путешественника</p><h1 tabindex="-1">Что сделать дальше?</h1><p class="lead">Выбери самый безопасный следующий шаг. Здесь можно пробовать и менять решение.</p><div class="decision-list">${actions}</div></div><div class="decision-art" aria-hidden="true"><span>${place.icon}</span><i>${meta.icon}</i></div></div>
  </section>`);
}

function renderCaseFeedback() {
  const caseItem = getCase(state.selectedCases[state.caseIndex]);
  const action = caseItem.actions.find((item) => item.id === state.lastActionId);
  const correct = state.lastAnswerCorrect;
  return chrome(`<section class="screen feedback-screen" data-screen="case-feedback" data-case-id="${caseItem.id}">
    <div class="feedback-card ${correct ? 'success' : 'try-again'}"><div class="feedback-icon" aria-hidden="true">${correct ? RISK_META[caseItem.risk].icon : '💡'}</div><p class="eyebrow">${correct ? 'Кристалл почти твой' : 'Хорошая попытка'}</p><h1 tabindex="-1">${correct ? 'Безопасное решение!' : 'Давай проверим ещё раз'}</h1><p>${escapeHtml(action?.feedback ?? '')}</p><button class="primary centered" type="button" data-action="${correct ? 'CONTINUE_CASE' : 'RETRY_CASE'}">${correct ? 'Забрать кристалл' : 'Вернуться к выбору'} <span aria-hidden="true">→</span></button></div>
  </section>`);
}

function renderShield() {
  const chosen = state.shieldSelected.map((id) => SHIELD_STEPS.find((item) => item.id === id));
  const order = ['tell', 'save', 'stop', 'block', 'dont'];
  const choices = order.map((id) => SHIELD_STEPS.find((item) => item.id === id)).filter((item) => !state.shieldSelected.includes(item.id)).map((item) => `<button class="shield-choice" type="button" data-action="SELECT_SHIELD_STEP" data-shield-step="${item.id}"><span aria-hidden="true">${item.icon}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.text)}</small></button>`).join('');
  return chrome(`<section class="screen shield-screen" data-screen="shield">
    <div class="section-head"><p class="eyebrow">Игра 4 · Финальная тренировка</p><h1 tabindex="-1">Собери Щит путешественника</h1><p>Выбирай следующий шаг по порядку. Первый вопрос: что нужно сделать сразу?</p></div>
    <div class="shield-slots">${SHIELD_STEPS.map((step, index) => { const item = chosen[index]; return `<div class="shield-slot ${item ? 'filled' : ''}"><b>${index + 1}</b>${item ? `<span>${item.icon}</span><strong>${escapeHtml(item.title)}</strong>` : '<small>Выбери шаг</small>'}</div>`; }).join('')}</div>
    ${state.shieldHintVisible ? '<div class="map-hint centered-hint" data-shield-hint>💡 Пока не этот шаг. Сначала остановись и не действуй в спешке.</div>' : ''}
    <div class="shield-choices">${choices}</div>
  </section>`);
}

function renderFinal() {
  const places = state.selectedPlaces.slice(0, 3).map(getPlace).filter(Boolean);
  const crystals = state.crystals.map((id) => RISK_META[id]).filter(Boolean);
  const restartPanel = restartPanelOpen ? `<div class="restart-overlay" data-restart-panel role="dialog" aria-modal="true" aria-labelledby="restart-title"><div class="restart-panel"><span aria-hidden="true">🗺️</span><h2 id="restart-title" tabindex="-1">Построить новую карту?</h2><p>Текущая карта и кристаллы начнутся заново.</p><div><button class="secondary" type="button" data-action="CANCEL_RESTART">Оставить эту карту</button><button class="primary" type="button" data-action="CONFIRM_RESTART">Начать заново</button></div></div></div>` : '';
  return chrome(`<section class="screen final-screen" data-screen="final">
    <div class="final-hero"><span aria-hidden="true">🧭</span><p class="eyebrow">Занятие завершено</p><h1 tabindex="-1">Цифровой путешественник</h1><p>Твоя карта стала безопаснее, а Щит готов помочь в новой ситуации.</p></div>
    <div class="final-grid"><div class="final-map"><h2>Моя цифровая карта</h2><div>${places.map((place) => `<article data-final-place><span>${place.icon}</span><strong>${escapeHtml(place.title)}</strong><p>${escapeHtml(place.rule)}</p></article>`).join('')}</div></div><div class="final-side"><section><h2>Четыре кристалла</h2><div class="final-crystals">${crystals.map((item) => `<span title="${escapeHtml(item.crystal)}">${item.icon}</span>`).join('')}</div></section><section class="shield-summary"><h2>Мой алгоритм</h2><ol>${SHIELD_STEPS.map((step) => `<li><span>${step.icon}</span><strong>${escapeHtml(step.title)}</strong></li>`).join('')}</ol></section></div></div>
    <button class="secondary restart-button" type="button" data-action="OPEN_RESTART">Пройти с другой картой</button>${restartPanel}
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
  else if (state.screen === 'case-clues') html = renderCaseClues();
  else if (state.screen === 'case-decision') html = renderCaseDecision();
  else if (state.screen === 'case-feedback') html = renderCaseFeedback();
  else if (state.screen === 'shield') html = renderShield();
  else if (state.screen === 'final-video') html = videoSlot(getVideo('safer-map'), 'final-video');
  else html = renderFinal();
  app.innerHTML = html;
  if (previousScreen !== state.screen) window.scrollTo(0, 0);
  previousScreen = state.screen;
  requestAnimationFrame(() => {
    const focusTarget = restartPanelOpen
      ? app.querySelector('#restart-title')
      : app.querySelector('h1[tabindex="-1"]');
    focusTarget?.focus({ preventScroll: true });
  });
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  if (control.dataset.action === 'OPEN_RESTART') { restartPanelOpen = true; render(); return; }
  if (control.dataset.action === 'CANCEL_RESTART') { restartPanelOpen = false; render(); return; }
  if (control.dataset.action === 'CONFIRM_RESTART') { resetLesson(); state = transition(state, { type: 'RESTART' }); restartPanelOpen = false; render(); return; }
  const payload = { type: control.dataset.action };
  if (control.dataset.warmupAnswer) payload.answer = control.dataset.warmupAnswer;
  if (control.dataset.placeId) payload.placeId = control.dataset.placeId;
  if (control.dataset.clueId) payload.clueId = control.dataset.clueId;
  if (control.dataset.actionId) payload.actionId = control.dataset.actionId;
  if (control.dataset.shieldStep) payload.stepId = control.dataset.shieldStep;
  state = transition(state, payload);
  saveLesson(state);
  render();
});

render();
