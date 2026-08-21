import { DISTRICTS, SHIELD_PARTS, VIDEOS } from './content.js';
import { createLocksState, evaluateLocks, renderLocks, updateLocks } from './chapters/locks.js';
import { createMirrorState, evaluateMirror, renderMirror, updateMirror } from './chapters/mirror.js';
import { createTrapsState, evaluateTrapCase, renderTraps, updateTraps } from './chapters/traps.js';
import { chooseChatReply, evaluateChatChoices, renderChat, renderChatResult, restoreChatChoices } from './chapters/chat.js';
import { stateForPreview, transition } from './lesson-state.js';
import { loadLesson, saveLesson } from './storage.js';
import { renderShell } from './ui.js';

const app = document.querySelector('#app');
const content = { districts: DISTRICTS, shieldParts: SHIELD_PARTS, videos: VIDEOS };
let state = loadLesson();
let locksState = createLocksState();
let mirrorState = createMirrorState();
let trapsState = createTrapsState();
let chatState = createChatState(state);

export function eventFromControl(control) {
  const action = control?.dataset.action;
  if (action === 'CHOOSE_CHILD_MODE') return { type: 'CHOOSE_MODE', mode: 'child' };
  if (action === 'CHOOSE_PREVIEW_MODE') return { type: 'CHOOSE_MODE', mode: 'preview' };
  if (action === 'SKIP_MEDIA') return { type: 'SKIP_MEDIA' };
  if (action === 'OPEN_DISTRICT') return { type: 'OPEN_DISTRICT', districtId: control.dataset.districtId };
  if (action === 'JUMP_TO_PREVIEW') return { type: 'JUMP_TO_PREVIEW', stage: control.dataset.previewStage };
  if (action === 'TOGGLE_MIRROR_DETAIL') return { type: 'TOGGLE_DETAIL', detailId: control.dataset.mirrorDetail };
  if (action === 'CHOOSE_MIRROR_CAPTION') return { type: 'CHOOSE_CAPTION', captionId: control.dataset.mirrorCaption };
  if (action === 'CLASSIFY_PASSWORD_CARD') return { type: action, cardId: control.dataset.passwordCard };
  if (action === 'ADD_PHRASE_CARD') return { type: action, cardId: control.dataset.phraseCard };
  if (action === 'SELECT_2FA_STEP') return { type: action, stepId: control.dataset['2faStep'] };
  if (action === 'TOGGLE_TRAP_CLUE') return { type: 'TOGGLE_CLUE', clueId: control.dataset.trapClue };
  if (action === 'CHOOSE_TRAP_ACTION') return { type: 'CHOOSE_ACTION', actionId: control.dataset.trapAction };
  if (action === 'CHOOSE_CHAT_REPLY') {
    return { type: action, nodeId: control.dataset.chatNode, replyId: control.dataset.chatReply };
  }
  if (action === 'CLAIM_REWARD') return { type: 'RETURN_TO_MAP' };
  return action ? { type: action } : null;
}

function dispatch(event) {
  if (!event) return;
  const previousScreen = state.screen;
  state = transition(state, event);
  if (state.mode === 'preview' && state.screen === 'chat' && previousScreen !== 'chat') {
    state = stateForPreview('chat');
  }
  if (state.screen === 'mirror' && previousScreen !== 'mirror') mirrorState = createMirrorState();
  if (state.screen === 'locks' && previousScreen !== 'locks') locksState = createLocksState();
  if (state.screen === 'traps' && previousScreen !== 'traps') trapsState = createTrapsState();
  if (state.screen === 'chat' && previousScreen !== 'chat') chatState = createChatState();
  if (previousScreen === 'locks' && state.screen !== 'locks') locksState = createLocksState();
  if (previousScreen === 'traps' && state.screen !== 'traps') trapsState = createTrapsState();
  saveLesson(state);
  render();
  if (state.screen !== previousScreen || event.type === 'JUMP_TO_PREVIEW') focusScreenHeading();
}

function dispatchMirror(event) {
  mirrorState = updateMirror(mirrorState, event);
  if (event.type === 'SUBMIT_MIRROR' && evaluateMirror(mirrorState).complete) {
    dispatch({ type: 'COMPLETE_CHAPTER', districtId: 'mirror' });
    return;
  }
  render();
}

function dispatchLocks(event) {
  locksState = updateLocks(locksState, event);
  if (evaluateLocks(locksState).complete) {
    dispatch({ type: 'COMPLETE_CHAPTER', districtId: 'locks' });
    app?.querySelector('[data-action="CLAIM_REWARD"]')?.focus();
    return;
  }
  render();
  restoreLocksFocus(event);
}

function dispatchTraps(event) {
  trapsState = updateTraps(trapsState, event);
  if (event.type === 'NEXT_TRAP_CASE' && trapsState.readyForReward) {
    dispatch({ type: 'COMPLETE_CHAPTER', districtId: 'traps' });
    app?.querySelector('[data-action="CLAIM_REWARD"]')?.focus();
    return;
  }
  render();
  restoreTrapsFocus(event);
}

function dispatchChat(event) {
  if (event.nodeId !== chatState.nodeId) return;
  const selection = chooseChatReply(event.nodeId, event.replyId);
  if (!selection) return;

  const choices = [...chatState.choices, selection.choice];
  chatState = {
    nodeId: selection.nextNodeId,
    choices,
    history: [...chatState.history, selection.choice],
    result: selection.finished ? evaluateChatChoices(choices) : null,
  };

  if (selection.finished) {
    dispatch({ type: 'COMPLETE_CHAPTER', districtId: 'messages', chatChoices: choices });
    app?.querySelector('[data-action="CLAIM_REWARD"]')?.focus();
    return;
  }

  render();
  app?.querySelector('[data-chat-reply]')?.focus();
}

function restoreLocksFocus(event) {
  let control = null;
  if (event.type === 'CLASSIFY_PASSWORD_CARD') {
    control = [...app.querySelectorAll('[data-password-card]')]
      .find((item) => item.dataset.passwordCard === event.cardId);
  }
  if (event.type === 'ADD_PHRASE_CARD') {
    control = app.querySelector('[data-phrase-card]:not([disabled])')
      ?? app.querySelector('[data-2fa-step]:not([disabled])');
  }
  if (event.type === 'SELECT_2FA_STEP') {
    control = app.querySelector('[data-2fa-step]:not([disabled])');
  }
  control?.focus();
}

function restoreTrapsFocus(event) {
  let control = null;
  if (event.type === 'TOGGLE_CLUE') {
    control = [...app.querySelectorAll('[data-trap-clue]')]
      .find((item) => item.dataset.trapClue === event.clueId);
  }
  if (event.type === 'CHOOSE_ACTION') {
    control = [...app.querySelectorAll('[data-trap-action]')]
      .find((item) => item.dataset.trapAction === event.actionId);
  }
  if (event.type === 'SUBMIT_TRAP') {
    const result = evaluateTrapCase(trapsState);
    control = result.complete
      ? app.querySelector('[data-action="NEXT_TRAP_CASE"]')
      : result.actionFeedback
        ? app.querySelector(`[data-trap-action="${trapsState.actionId}"]`)
        : app.querySelector('[data-action="SUBMIT_TRAP"]');
  }
  if (event.type === 'NEXT_TRAP_CASE') control = app.querySelector('[data-trap-clue]');
  control?.focus();
}

function render() {
  if (!app) return;
  app.innerHTML = renderShell(state, content);
  const screen = app.querySelector('#main-content > [data-screen]');
  if (state.screen === 'mirror') screen?.replaceWith(fragment(renderMirror(mirrorState)));
  if (state.screen === 'locks') screen?.replaceWith(fragment(renderLocks(locksState)));
  if (state.screen === 'traps') screen?.replaceWith(fragment(renderTraps(trapsState)));
  if (state.screen === 'chat') screen?.replaceWith(fragment(renderChat(chatState)));
  if (state.screen === 'reward' && state.activeDistrict === 'mirror') {
    screen?.replaceWith(fragment(renderMirrorReward()));
  }
  if (state.screen === 'reward' && state.activeDistrict === 'locks') {
    screen?.replaceWith(fragment(renderLocksReward()));
  }
  if (state.screen === 'reward' && state.activeDistrict === 'traps') {
    screen?.replaceWith(fragment(renderTrapsReward()));
  }
  if (state.screen === 'reward' && state.activeDistrict === 'messages') {
    screen?.replaceWith(fragment(renderChatResult(chatState)));
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
  if (state.screen === 'locks' && ['CLASSIFY_PASSWORD_CARD', 'ADD_PHRASE_CARD', 'SELECT_2FA_STEP'].includes(nextEvent?.type)) {
    dispatchLocks(nextEvent);
    return;
  }
  if (state.screen === 'traps' && ['TOGGLE_CLUE', 'CHOOSE_ACTION', 'SUBMIT_TRAP', 'NEXT_TRAP_CASE'].includes(nextEvent?.type)) {
    dispatchTraps(nextEvent);
    return;
  }
  if (state.screen === 'chat' && nextEvent?.type === 'CHOOSE_CHAT_REPLY') {
    dispatchChat(nextEvent);
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

function focusScreenHeading() {
  const heading = app?.querySelector('h1');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus();
}

function createChatState(lessonState) {
  const choices = lessonState?.screen === 'reward' && lessonState.activeDistrict === 'messages'
    ? restoreChatChoices(lessonState.chatChoices)
    : [];
  return {
    nodeId: 'pass-request',
    choices,
    history: [],
    result: choices.length ? evaluateChatChoices(choices) : null,
  };
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

function renderLocksReward() {
  return `
    <section class="locks-reward" data-screen="reward">
      <div class="locks-reward__badge" aria-hidden="true">🏰 🔐</div>
      <p class="eyebrow">Задание выполнено!</p>
      <h1>Замок секретов защищён</h1>
      <p class="lead">Длинная непредсказуемая фраза и второй замок работают вместе. Пароли и коды подтверждения всегда остаются секретом.</p>
      <div class="locks-reward__rule">
        <span aria-hidden="true">🤫</span>
        <p><strong>Никому не пересылай пароль или код.</strong><br>Даже если об этом просит знакомый.</p>
      </div>
      <div class="locks-reward__claim">
        <div class="shield-part" data-reward-part="secret"><span aria-hidden="true">🧩</span><p>Часть щита<br><strong>«Секретный ключ»</strong></p></div>
        <button class="button button--primary" type="button" data-action="CLAIM_REWARD">Забрать деталь и вернуться на карту <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
}

function renderTrapsReward() {
  return `
    <section class="traps-reward" data-screen="reward">
      <div class="traps-reward__badge" aria-hidden="true">🔎 🛡️</div>
      <p class="eyebrow">Задание выполнено!</p>
      <h1>Ты стал детективом ловушек</h1>
      <p class="lead" data-traps-summary>Ты научился замечать спешку, подарки, просьбы о секретах и странные ссылки. Остановись, проверь ситуацию другим способом и обязательно расскажи взрослому, которому доверяешь.</p>
      <div class="traps-reward__rule"><span aria-hidden="true">⏸️</span><p><strong>Пауза — Проверка — Взрослый.</strong><br>Эти три шага помогают не спешить и не отдавать секреты.</p></div>
      <div class="traps-reward__claim">
        <div class="shield-part" data-reward-part="check"><span aria-hidden="true">🧩</span><p>Часть щита<br><strong>«Проверка»</strong></p></div>
        <button class="button button--primary" type="button" data-action="CLAIM_REWARD">Забрать деталь и вернуться на карту <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
}
