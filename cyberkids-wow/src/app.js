import { MISSIONS, getMission } from './missions.js';
import { createInitialState, transition } from './game-state.js';

const app = document.querySelector('#app');
let state = createInitialState();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function missionTheme(mission) {
  if (!mission) return '';
  return `--primary:${mission.theme.primary};--secondary:${mission.theme.secondary};--accent:${mission.theme.accent};--deep:${mission.theme.deep};--soft:${mission.theme.soft}`;
}

function chrome(content, mission = null, options = {}) {
  const completed = state.completed.length;
  const back = options.back
    ? '<button class="icon-button" type="button" data-action="HOME" aria-label="Вернуться к выбору миссий">←</button>'
    : '<span class="logo-mark" aria-hidden="true">✦</span>';
  const missionLabel = mission ? `<span class="current-world">${escapeHtml(mission.hero)} ${escapeHtml(mission.title)}</span>` : '';

  return `
    <main class="experience ${mission ? `theme-${mission.id}` : 'theme-home'}" style="${missionTheme(mission)}">
      <header class="topbar">
        <div class="brand">${back}<span>КиберМиссии</span></div>
        ${missionLabel}
        <div class="score-pill" aria-label="Пройдено миссий: ${completed} из 3"><span aria-hidden="true">🏅</span> ${completed}/3</div>
      </header>
      ${content}
      <footer class="footer-note">Без регистрации · Без реальных ссылок · Только безопасные тренировки</footer>
    </main>`;
}

function renderHome() {
  const cards = MISSIONS.map((mission, index) => {
    const complete = state.completed.includes(mission.id);
    return `
      <button class="mission-card theme-${mission.id}" style="${missionTheme(mission)}" type="button" data-action="SELECT_MISSION" data-mission-id="${mission.id}">
        <span class="card-number">0${index + 1}</span>
        <span class="mission-art" aria-hidden="true"><span class="hero-orbit"></span><span class="hero-emoji">${mission.hero}</span></span>
        <span class="mission-copy">
          <span class="mission-title">${escapeHtml(mission.title)}</span>
          <span class="mission-subtitle">${escapeHtml(mission.subtitle)}</span>
        </span>
        <span class="mission-status">${complete ? `${mission.badge.icon} Пройдено` : 'Начать миссию →'}</span>
      </button>`;
  }).join('');

  return chrome(`
    <section class="home-screen screen" data-screen="home">
      <div class="hero-heading">
        <p class="eyebrow">Три мира · Три важных навыка</p>
        <h1 tabindex="-1">Стань героем<br><span>цифрового мира</span></h1>
        <p class="lead">Выбери приключение, найди ловушки и помоги герою принять безопасное решение.</p>
      </div>
      <div class="mission-grid">${cards}</div>
      <div class="home-tip"><span aria-hidden="true">💡</span><p><strong>Главный секрет:</strong> если в интернете страшно, странно или слишком срочно — остановись и позови взрослого.</p></div>
    </section>`);
}

function progressRail(activeIndex) {
  const labels = ['История', 'Ловушки', 'Решение', 'Награда'];
  return `<ol class="progress-rail" aria-label="Этапы миссии">${labels.map((label, index) => `
    <li class="${index < activeIndex ? 'done' : ''} ${index === activeIndex ? 'active' : ''}">
      <span>${index < activeIndex ? '✓' : index + 1}</span><em>${label}</em>
    </li>`).join('')}</ol>`;
}

function character(mission, mood = 'ready') {
  return `<div class="character character-${mood}" aria-hidden="true">
    <span class="character-glow"></span>
    <span class="character-emoji">${mission.hero}</span>
    <span class="character-name">${escapeHtml(mission.heroName)}</span>
  </div>`;
}

function renderIntro(mission) {
  return chrome(`
    <section class="story-screen screen two-column" data-screen="intro">
      <div class="story-copy">
        ${progressRail(0)}
        <p class="eyebrow">${escapeHtml(mission.intro.kicker)}</p>
        <h1 tabindex="-1">${escapeHtml(mission.intro.title)}</h1>
        <p class="lead">${escapeHtml(mission.intro.text)}</p>
        <div class="speech-bubble"><span aria-hidden="true">💬</span><p>«${escapeHtml(mission.intro.speech)}»</p></div>
        <button class="primary-button" type="button" data-action="START">Принять миссию <span aria-hidden="true">→</span></button>
      </div>
      <div class="story-visual">${character(mission)}</div>
    </section>`, mission, { back: true });
}

function messageCard(mission) {
  return `<article class="message-card" aria-label="Подозрительное сообщение">
    <header><span class="sender-avatar" aria-hidden="true">${mission.trap.avatar}</span><span><strong>${escapeHtml(mission.trap.sender)}</strong><small>${escapeHtml(mission.trap.status)}</small></span><span class="more" aria-hidden="true">•••</span></header>
    <div class="message-body"><p>${escapeHtml(mission.trap.message)}</p><span class="fake-cta">${escapeHtml(mission.trap.cta)}</span></div>
    <footer>${escapeHtml(mission.trap.footer)}</footer>
  </article>`;
}

function renderClues(mission) {
  const clueButtons = mission.trap.clues.map((clue) => {
    const selected = state.selectedClues.includes(clue.id);
    return `<button class="clue-chip ${selected ? 'selected' : ''}" type="button" data-action="TOGGLE_CLUE" data-clue-id="${clue.id}" aria-pressed="${selected}"><span>${selected ? '✓' : '?'}</span>${escapeHtml(clue.label)}</button>`;
  }).join('');

  const hint = state.clueHintVisible
    ? `<div class="hint-panel" role="status"><span aria-hidden="true">🔎</span><p><strong>Почти!</strong> ${escapeHtml(mission.trap.hint)}</p></div>`
    : '';

  return chrome(`
    <section class="challenge-screen screen" data-screen="clues">
      ${progressRail(1)}
      <div class="section-heading"><p class="eyebrow">Раунд 1</p><h1 tabindex="-1">Найди три ловушки</h1><p>Отметь всё подозрительное. Можно менять выбор.</p></div>
      <div class="challenge-layout">
        ${messageCard(mission)}
        <div class="clue-panel"><p class="panel-label">Что здесь настораживает?</p><div class="clue-list">${clueButtons}</div>${hint}<button class="primary-button wide" type="button" data-action="SUBMIT_CLUES">Проверить находки</button></div>
      </div>
    </section>`, mission, { back: true });
}

function renderDecision(mission) {
  const actions = mission.decision.actions.map((action) => `
    <button class="action-card" type="button" data-action="CHOOSE_ACTION" data-action-id="${action.id}">
      <span class="action-icon" aria-hidden="true">${action.icon}</span>
      <span>${escapeHtml(action.label)}</span>
      <span class="action-arrow" aria-hidden="true">→</span>
    </button>`).join('');

  return chrome(`
    <section class="decision-screen screen two-column" data-screen="decision">
      <div class="decision-copy">
        ${progressRail(2)}
        <p class="eyebrow">Финальный выбор</p>
        <h1 tabindex="-1">${escapeHtml(mission.decision.title)}</h1>
        <p class="lead">Выбери самое безопасное действие. Ошибиться не страшно — можно попробовать снова.</p>
        <div class="action-list">${actions}</div>
      </div>
      <div class="story-visual compact">${character(mission, 'thinking')}</div>
    </section>`, mission, { back: true });
}

function renderFeedback(mission) {
  const action = mission.decision.actions.find((item) => item.id === state.lastActionId);
  const correct = state.lastAnswerCorrect;
  return chrome(`
    <section class="feedback-screen screen" data-screen="feedback">
      ${progressRail(2)}
      <div class="feedback-card ${correct ? 'success' : 'try-again'}">
        <div class="feedback-symbol" aria-hidden="true">${correct ? '🛡️' : '💡'}</div>
        <p class="eyebrow">${correct ? 'Безопасное решение' : 'Хорошая попытка'}</p>
        <h1 tabindex="-1">${correct ? 'Герой в безопасности!' : 'Давай подумаем ещё раз'}</h1>
        <p>${escapeHtml(action?.feedback ?? '')}</p>
        <button class="primary-button" type="button" data-action="${correct ? 'CONTINUE' : 'RETRY'}">${correct ? 'Получить награду' : 'Попробовать снова'} <span aria-hidden="true">→</span></button>
      </div>
    </section>`, mission, { back: true });
}

function renderReward(mission) {
  return chrome(`
    <section class="reward-screen screen" data-screen="reward">
      ${progressRail(3)}
      <div class="confetti" aria-hidden="true"><i>✦</i><i>●</i><i>▲</i><i>★</i><i>●</i><i>✦</i></div>
      <div class="badge-card">
        <p class="eyebrow">Миссия выполнена</p>
        <div class="badge-icon" aria-hidden="true">${mission.badge.icon}</div>
        <h1 tabindex="-1">${escapeHtml(mission.badge.name)}</h1>
        <p class="badge-copy">${escapeHtml(mission.badge.text)}</p>
        <div class="rule-card"><span aria-hidden="true">📌</span><p><strong>Запомни правило</strong>${escapeHtml(mission.rule)}</p></div>
        <button class="primary-button" type="button" data-action="CONTINUE">Выбрать новую миссию <span aria-hidden="true">→</span></button>
      </div>
    </section>`, mission, { back: true });
}

function render() {
  const mission = getMission(state.missionId);
  const screen = state.screen;
  const html = screen === 'home' || !mission
    ? renderHome()
    : screen === 'intro'
      ? renderIntro(mission)
      : screen === 'clues'
        ? renderClues(mission)
        : screen === 'decision'
          ? renderDecision(mission)
          : screen === 'feedback'
            ? renderFeedback(mission)
            : renderReward(mission);

  app.innerHTML = html;
  document.body.dataset.mission = mission?.id ?? 'home';
  requestAnimationFrame(() => app.querySelector('h1[tabindex="-1"]')?.focus({ preventScroll: true }));
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;

  const action = control.dataset.action;
  const payload = { type: action };
  if (control.dataset.missionId) payload.missionId = control.dataset.missionId;
  if (control.dataset.clueId) payload.clueId = control.dataset.clueId;
  if (control.dataset.actionId) payload.actionId = control.dataset.actionId;
  state = transition(state, payload);
  render();
});

render();
