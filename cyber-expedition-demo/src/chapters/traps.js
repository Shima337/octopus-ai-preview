export const TRAP_CASES = [
  {
    id: 'prize-message',
    sender: 'Подарочный бот',
    message: '«Ты выиграл редкий игровой набор! Забери приз за 5 минут. Никому не говори и пришли данные карты взрослого, чтобы получить награду».',
    clues: [
      { id: 'prize', label: 'Неожиданный дорогой приз', category: 'reward', risky: true },
      { id: 'timer', label: 'Срок «за 5 минут»', category: 'urgency', risky: true },
      { id: 'secret-request', label: 'Просьба скрыть сообщение и прислать данные', category: 'secrecy', risky: true },
    ],
    actions: [
      { id: 'follow-request', label: 'Сразу отправить данные', safe: false, explanation: 'Не отправляй данные из-за обещания приза. Остановись и выбери безопасный шаг.' },
      { id: 'tell-adult', label: 'Показать сообщение взрослому', safe: true, explanation: 'Взрослый поможет проверить обещание и не отправлять данные.' },
    ],
  },
  {
    id: 'screen-code',
    sender: 'Новый профиль «Поддержка игры»',
    message: '«Пришли скриншот экрана с кодом подтверждения. Так мы быстро проверим аккаунт. Пишу с нового профиля, потому что служебный сейчас недоступен».',
    clues: [
      { id: 'screenshot', label: 'Просят скриншот экрана', category: 'screen', risky: true },
      { id: 'confirmation-code', label: 'На скриншоте будет код подтверждения', category: 'secret', risky: true },
      { id: 'unknown-contact', label: 'Незнакомый новый профиль', category: 'sender', risky: true },
    ],
    actions: [
      { id: 'send-screenshot', label: 'Отправить скриншот', safe: false, explanation: 'Код подтверждения — секрет. Скриншот тоже может его раскрыть. Попробуй выбрать ещё раз.' },
      { id: 'tell-adult', label: 'Показать сообщение взрослому', safe: true, explanation: 'Взрослый поможет узнать, настоящая ли это поддержка.' },
    ],
  },
  {
    id: 'friend-link',
    sender: 'Новый профиль «Миша?»',
    message: '«Привет! Это я, Миша. Пишу немного необычно, потому что спешу. Открой кнопку „Подарок другу“ и введи свой пароль — тогда нам дадут бонус».',
    clues: [
      { id: 'unusual-style', label: 'Друг пишет непривычно', category: 'style', risky: true },
      { id: 'unexpected-link', label: 'Неожиданная кнопка с подарком', category: 'link', risky: true },
      { id: 'password-request', label: 'Просьба ввести пароль', category: 'password', risky: true },
    ],
    actions: [
      { id: 'open-link', label: 'Открыть кнопку и ввести пароль', safe: false, explanation: 'Пароль нельзя вводить по неожиданной просьбе. Остановись и выбери другой шаг.' },
      { id: 'verify-another-way', label: 'Связаться с другом другим способом', safe: true, explanation: 'Звонок или личный разговор поможет проверить, он ли писал.' },
      { id: 'block-contact', label: 'Заблокировать подозрительный профиль', safe: true, explanation: 'Блокировка остановит новые просьбы от этого профиля.' },
      { id: 'tell-adult', label: 'Показать сообщение взрослому', safe: true, explanation: 'Взрослый поможет проверить профиль и выбрать безопасный шаг.' },
    ],
  },
];

const CASE_IDS = new Set(TRAP_CASES.map((item) => item.id));
const CATEGORY_HINTS = {
  reward: 'Проверь, не заманивают ли тебя неожиданной наградой.',
  urgency: 'Посмотри, не заставляют ли тебя спешить из-за короткого срока.',
  secrecy: 'Проверь просьбу скрыть разговор или передать данные.',
  screen: 'Подумай, что может быть видно на просимом снимке экрана.',
  secret: 'Найди в сообщении секрет, который нельзя передавать.',
  sender: 'Проверь, знаком ли тебе профиль отправителя.',
  style: 'Сравни стиль сообщения с тем, как обычно пишет друг.',
  link: 'Найди неожиданную кнопку, которую тебя просят открыть.',
  password: 'Проверь, не просят ли в сообщении ввести пароль.',
};

export function createTrapsState() {
  return {
    caseIndex: 0,
    selectedClueIds: [],
    actionId: null,
    submitted: false,
    solvedCaseIds: [],
    readyForReward: false,
  };
}

export function updateTraps(state, event) {
  const current = normalizeTrapsState(state);
  const trapCase = TRAP_CASES[current.caseIndex];
  if (!event?.type || current.readyForReward) return current;

  if (event.type === 'TOGGLE_CLUE' && trapCase.clues.some((clue) => clue.id === event.clueId)) {
    const selected = new Set(current.selectedClueIds);
    if (selected.has(event.clueId)) selected.delete(event.clueId);
    else selected.add(event.clueId);
    return { ...current, selectedClueIds: [...selected], submitted: false };
  }

  if (event.type === 'CHOOSE_ACTION' && trapCase.actions.some((action) => action.id === event.actionId)) {
    return { ...current, actionId: event.actionId, submitted: false };
  }

  if (event.type === 'SUBMIT_TRAP') return { ...current, submitted: true };

  if (event.type === 'NEXT_TRAP_CASE' && evaluateTrapCase(current).complete) {
    const solvedCaseIds = appendUnique(current.solvedCaseIds, trapCase.id);
    if (current.caseIndex === TRAP_CASES.length - 1) {
      return { ...current, solvedCaseIds, submitted: true, readyForReward: true };
    }
    return {
      ...current,
      caseIndex: current.caseIndex + 1,
      selectedClueIds: [],
      actionId: null,
      submitted: false,
      solvedCaseIds,
    };
  }

  return current;
}

export function evaluateTrapCase(state) {
  const current = normalizeTrapsState(state);
  const trapCase = TRAP_CASES[current.caseIndex];
  const riskyClues = trapCase.clues.filter((clue) => clue.risky);
  const missedClues = riskyClues.filter((clue) => !current.selectedClueIds.includes(clue.id));
  const action = trapCase.actions.find((item) => item.id === current.actionId) ?? null;

  return {
    complete: missedClues.length === 0 && action?.safe === true,
    found: riskyClues.length - missedClues.length,
    missed: missedClues.map((clue) => clue.id),
    safeAction: action?.safe === true,
    hint: missedClues.length > 0
      ? CATEGORY_HINTS[missedClues[0].category]
      : action ? null : 'Выбери, как безопасно поступить с этим сообщением.',
    actionFeedback: action && !action.safe ? action.explanation : null,
  };
}

export function renderTraps(state) {
  const current = normalizeTrapsState(state);
  const trapCase = TRAP_CASES[current.caseIndex];
  const result = evaluateTrapCase(current);
  const clueButtons = trapCase.clues.map((clue) => {
    const selected = current.selectedClueIds.includes(clue.id);
    return `
      <button class="trap-choice trap-clue${selected ? ' trap-choice--selected' : ''}" type="button"
        data-action="TOGGLE_TRAP_CLUE" data-trap-clue="${clue.id}" aria-pressed="${selected}">
        <span class="trap-choice__mark" aria-hidden="true">${selected ? '✓' : '+'}</span>
        <span>${clue.label}</span>
      </button>`;
  }).join('');
  const actionButtons = trapCase.actions.map((action) => {
    const selected = current.actionId === action.id;
    return `
      <button class="trap-choice trap-action${selected ? ' trap-choice--selected' : ''}" type="button"
        data-action="CHOOSE_TRAP_ACTION" data-trap-action="${action.id}" aria-pressed="${selected}">
        <span class="trap-choice__radio" aria-hidden="true">${selected ? '●' : '○'}</span>
        <span>${action.label}</span>
      </button>`;
  }).join('');

  let feedback = '';
  if (current.submitted && !result.complete && result.missed.length > 0) {
    feedback = `<div class="traps-feedback traps-feedback--hint" data-trap-hint role="status"><span aria-hidden="true">💡</span><p><strong>Одна подсказка:</strong> ${result.hint}</p></div>`;
  } else if (current.submitted && result.actionFeedback) {
    feedback = `<div class="traps-feedback traps-feedback--retry" data-trap-action-feedback role="status"><span aria-hidden="true">🛡️</span><p><strong>Спокойно, можно попробовать ещё раз.</strong> ${result.actionFeedback}</p></div>`;
  } else if (current.submitted && result.hint) {
    feedback = `<div class="traps-feedback traps-feedback--hint" data-trap-hint role="status"><span aria-hidden="true">💡</span><p>${result.hint}</p></div>`;
  }

  const controls = current.submitted && result.complete
    ? `<div class="traps-solved" role="status"><p><strong>Ловушка раскрыта!</strong> Ты заметил признаки и выбрал безопасный шаг.</p>
      <button class="button button--primary" type="button" data-action="NEXT_TRAP_CASE">${current.caseIndex === TRAP_CASES.length - 1 ? 'Перейти к итогу' : 'Следующее дело'} <span aria-hidden="true">→</span></button></div>`
    : `${feedback}<button class="button button--primary traps-submit" type="button" data-action="SUBMIT_TRAP">Проверить решение <span aria-hidden="true">→</span></button>`;

  return `
    <section class="traps-game" data-screen="traps">
      <div class="traps-game__intro">
        <p class="eyebrow">Ярмарка ловушек · Дело ${current.caseIndex + 1} из ${TRAP_CASES.length}</p>
        <h1>Раскрой цифровую ловушку</h1>
        <p class="lead">Изучи вымышленное сообщение, отметь три подозрительные признака и выбери безопасное действие.</p>
      </div>

      <div class="traps-workspace">
        <article class="trap-message" aria-label="Вымышленное учебное сообщение">
          <p class="trap-message__notice"><span aria-hidden="true">🧪</span> Всё сообщение вымышлено</p>
          <div class="trap-message__sender"><span aria-hidden="true">💬</span><p><strong>${trapCase.sender}</strong><br><span>Учебный макет</span></p></div>
          <p class="trap-message__bubble" data-trap-message>${trapCase.message}</p>
        </article>

        <div class="traps-detective">
          <fieldset class="traps-fieldset">
            <legend>1. Какие признаки выдают ловушку?</legend>
            <div class="trap-choice-list">${clueButtons}</div>
          </fieldset>
          <p class="traps-found" data-trap-found aria-live="polite">Найдено: <strong>${result.found} из 3</strong></p>
          <fieldset class="traps-fieldset traps-fieldset--actions">
            <legend>2. Как ты поступишь?</legend>
            <div class="trap-choice-list trap-choice-list--actions">${actionButtons}</div>
          </fieldset>
          ${controls}
        </div>
      </div>
    </section>`;
}

function normalizeTrapsState(state) {
  const source = state && typeof state === 'object' ? state : {};
  const caseIndex = Number.isInteger(source.caseIndex) && source.caseIndex >= 0 && source.caseIndex < TRAP_CASES.length
    ? source.caseIndex
    : 0;
  const trapCase = TRAP_CASES[caseIndex];
  const clueIds = new Set(trapCase.clues.map((clue) => clue.id));
  const actionIds = new Set(trapCase.actions.map((action) => action.id));
  const solvedCaseIds = Array.isArray(source.solvedCaseIds)
    ? [...new Set(source.solvedCaseIds.filter((id) => CASE_IDS.has(id)))]
    : [];
  return {
    caseIndex,
    selectedClueIds: uniqueAllowed(source.selectedClueIds, clueIds),
    actionId: actionIds.has(source.actionId) ? source.actionId : null,
    submitted: source.submitted === true,
    solvedCaseIds,
    readyForReward: source.readyForReward === true && solvedCaseIds.length === TRAP_CASES.length,
  };
}

function uniqueAllowed(values, allowed) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

function appendUnique(values, value) {
  return values.includes(value) ? values : [...values, value];
}
