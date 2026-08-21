import { DISTRICTS, SHIELD_PARTS, VIDEOS } from './content.js';
import { createMirrorState, evaluateMirror, renderMirror, updateMirror } from './chapters/mirror.js';
import { transition } from './lesson-state.js';
import { loadLesson, saveLesson } from './storage.js';
import { renderShell } from './ui.js';

const app = document.querySelector('#app');
const content = { districts: DISTRICTS, shieldParts: SHIELD_PARTS, videos: VIDEOS };
let state = loadLesson();
let mirrorState = createMirrorState();

export function eventFromControl(control) {
  const action = control?.dataset.action;
  if (action === 'CHOOSE_CHILD_MODE') return { type: 'CHOOSE_MODE', mode: 'child' };
  if (action === 'CHOOSE_PREVIEW_MODE') return { type: 'CHOOSE_MODE', mode: 'preview' };
  if (action === 'SKIP_MEDIA') return { type: 'SKIP_MEDIA' };
  if (action === 'OPEN_DISTRICT') return { type: 'OPEN_DISTRICT', districtId: control.dataset.districtId };
  if (action === 'JUMP_TO_PREVIEW') return { type: 'JUMP_TO_PREVIEW', stage: control.dataset.previewStage };
  if (action === 'TOGGLE_MIRROR_DETAIL') return { type: 'TOGGLE_DETAIL', detailId: control.dataset.mirrorDetail };
  if (action === 'CHOOSE_MIRROR_CAPTION') return { type: 'CHOOSE_CAPTION', captionId: control.dataset.mirrorCaption };
  if (action === 'CLAIM_REWARD') return { type: 'RETURN_TO_MAP' };
  return action ? { type: action } : null;
}

function dispatch(event) {
  if (!event) return;
  const previousScreen = state.screen;
  state = transition(state, event);
  if (state.screen === 'mirror' && previousScreen !== 'mirror') mirrorState = createMirrorState();
  saveLesson(state);
  render();
}

function dispatchMirror(event) {
  mirrorState = updateMirror(mirrorState, event);
  if (event.type === 'SUBMIT_MIRROR' && evaluateMirror(mirrorState).complete) {
    dispatch({ type: 'COMPLETE_CHAPTER', districtId: 'mirror' });
    return;
  }
  render();
}

function render() {
  if (!app) return;
  app.innerHTML = renderShell(state, content);
  const screen = app.querySelector('#main-content > [data-screen]');
  if (state.screen === 'mirror') screen?.replaceWith(fragment(renderMirror(mirrorState)));
  if (state.screen === 'reward' && state.activeDistrict === 'mirror') {
    screen?.replaceWith(fragment(renderMirrorReward()));
  }
}

app?.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control || !app.contains(control)) return;
  const nextEvent = eventFromControl(control);
  if (state.screen === 'mirror' && ['TOGGLE_DETAIL', 'CHOOSE_CAPTION', 'SUBMIT_MIRROR'].includes(nextEvent?.type)) {
    dispatchMirror(nextEvent);
    return;
  }
  dispatch(nextEvent);
});

render();

function fragment(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function renderMirrorReward() {
  return `
    <section class="mirror-reward" data-screen="reward">
      <div class="mirror-reward__heading">
        <p class="eyebrow">Задание выполнено!</p>
        <h1>Пост стал безопаснее</h1>
        <p class="lead">Ты убрал детали, по которым можно найти человека, и выбрал подпись без личных подсказок.</p>
      </div>

      <div class="mirror-comparison" aria-label="Сравнение поста до и после проверки">
        <article class="mirror-comparison__card mirror-comparison__card--before" data-mirror-comparison="before">
          <p class="mirror-comparison__label"><span aria-hidden="true">⚠️</span> До проверки</p>
          <div class="mirror-comparison__photo" aria-hidden="true">🏫 &nbsp; 📍 &nbsp; 🪪 &nbsp; 🏠</div>
          <p>«После уроков у школы… рядом с домом № 24»</p>
          <ul><li>Видна школа</li><li>Остались место, пропуск и адрес</li></ul>
        </article>
        <div class="mirror-comparison__arrow" aria-hidden="true">→</div>
        <article class="mirror-comparison__card mirror-comparison__card--after" data-mirror-comparison="after">
          <p class="mirror-comparison__label"><span aria-hidden="true">✅</span> После проверки</p>
          <div class="mirror-comparison__photo" aria-hidden="true">🌿 &nbsp; 🐈 &nbsp; ☁️ &nbsp; ✨</div>
          <p>«Отличный день для фото с Барсиком!»</p>
          <ul><li>Остались только нейтральные детали</li><li>Подпись не выдаёт место</li></ul>
        </article>
      </div>

      <div class="mirror-rule">
        <span class="mirror-rule__shield" aria-hidden="true">🛡️</span>
        <div><p class="eyebrow">Главное правило</p><h2>Не показывай то, по чему тебя можно найти</h2>
        <p class="mirror-rule__nos"><strong>Нет</strong> адресу <span>•</span> <strong>Нет</strong> школе <span>•</span> <strong>Нет</strong> телефону</p></div>
      </div>

      <div class="mirror-reward__claim">
        <div class="shield-part" data-reward-part><span aria-hidden="true">🧩</span><p>Часть щита<br><strong>«Личные данные»</strong></p></div>
        <button class="button button--primary" type="button" data-action="CLAIM_REWARD">Забрать деталь и вернуться на карту <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
}
