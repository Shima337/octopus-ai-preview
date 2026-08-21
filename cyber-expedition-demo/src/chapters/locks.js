export const PASSWORD_CARDS = [
  {
    id: 'digits',
    label: 'Цифры по порядку: 123456',
    strength: 'weak',
    explanation: 'Такую последовательность легко угадать с первых попыток.',
    icon: '🔢',
  },
  {
    id: 'hero-name',
    label: 'Имя любимого героя',
    strength: 'weak',
    explanation: 'Знакомые имена могут знать друзья или увидеть злоумышленник.',
    icon: '🦸',
  },
  {
    id: 'long-random-phrase',
    label: 'Длинная случайная фраза',
    strength: 'stronger',
    explanation: 'Длинную неожиданную фразу труднее угадать. Её всё равно нельзя никому сообщать.',
    icon: '🧩',
  },
];

export const PHRASE_CARDS = [
  { id: 'rocket', label: 'ракета', icon: '🚀' },
  { id: 'forest', label: 'лес', icon: '🌲' },
  { id: 'teacup', label: 'чашка', icon: '🍵' },
  { id: 'comet', label: 'комета', icon: '☄️' },
  { id: 'drum', label: 'барабан', icon: '🥁' },
];

export const TWO_FACTOR_STEPS = [
  { id: 'password', order: 0, label: 'Открыть первый замок секретной фразой', icon: '🔑' },
  { id: 'trusted-device', order: 1, label: 'Подтвердить вход на доверенном устройстве', icon: '📱' },
  { id: 'keep-code-secret', order: 2, label: 'Никому не отправлять код подтверждения', icon: '🤫' },
];

const PASSWORD_CARD_IDS = new Set(PASSWORD_CARDS.map((card) => card.id));
const PHRASE_CARD_IDS = new Set(PHRASE_CARDS.map((card) => card.id));
const TWO_FACTOR_STEP_IDS = new Set(TWO_FACTOR_STEPS.map((step) => step.id));
const TWO_FACTOR_HINT = 'Ничего страшного: сначала открой первый замок секретной фразой, а потом добавь второй.';

export function classifyPasswordCard(cardId) {
  return PASSWORD_CARDS.find((card) => card.id === cardId)?.strength ?? null;
}

export function createLocksState() {
  return {
    reviewedPasswordCardIds: [],
    phraseCardIds: [],
    twoFactorStepIds: [],
    twoFactorHint: null,
  };
}

export function updateLocks(state, event) {
  const current = normalizeLocksState(state);
  if (!event?.type) return current;

  if (event.type === 'CLASSIFY_PASSWORD_CARD' && PASSWORD_CARD_IDS.has(event.cardId)) {
    return {
      ...current,
      reviewedPasswordCardIds: appendUnique(current.reviewedPasswordCardIds, event.cardId),
    };
  }

  if (event.type === 'ADD_PHRASE_CARD' && PHRASE_CARD_IDS.has(event.cardId)) {
    if (current.phraseCardIds.length >= 3) return current;
    return { ...current, phraseCardIds: appendUnique(current.phraseCardIds, event.cardId).slice(0, 3) };
  }

  if (event.type === 'SELECT_2FA_STEP' && TWO_FACTOR_STEP_IDS.has(event.stepId)) {
    if (current.twoFactorStepIds.length === TWO_FACTOR_STEPS.length) return current;
    const expectedStep = TWO_FACTOR_STEPS[current.twoFactorStepIds.length];
    if (event.stepId !== expectedStep.id) {
      return { ...current, twoFactorStepIds: [], twoFactorHint: TWO_FACTOR_HINT };
    }
    return {
      ...current,
      twoFactorStepIds: [...current.twoFactorStepIds, event.stepId],
      twoFactorHint: null,
    };
  }

  return current;
}

export function evaluateLocks(state) {
  const current = normalizeLocksState(state);
  const phraseComplete = current.phraseCardIds.length === 3;
  const twoFactorComplete = current.twoFactorStepIds.length === TWO_FACTOR_STEPS.length
    && current.twoFactorStepIds.every((id, index) => id === TWO_FACTOR_STEPS[index].id);

  return {
    complete: phraseComplete && twoFactorComplete,
    passwordCardsComplete: current.reviewedPasswordCardIds.length === PASSWORD_CARDS.length,
    phraseComplete,
    twoFactorComplete,
    hint: current.twoFactorHint,
  };
}

export function renderLocks(state) {
  const current = normalizeLocksState(state);
  const result = evaluateLocks(current);
  const passwordCards = PASSWORD_CARDS.map((card) => {
    const reviewed = current.reviewedPasswordCardIds.includes(card.id);
    const strengthLabel = card.strength === 'weak' ? 'Легко угадать' : 'Надёжнее';
    return `
      <button class="locks-card locks-card--password${reviewed ? ` locks-card--${card.strength}` : ''}" type="button"
        data-action="CLASSIFY_PASSWORD_CARD" data-password-card="${card.id}" aria-pressed="${reviewed}">
        <span class="locks-card__icon" aria-hidden="true">${card.icon}</span>
        <span class="locks-card__copy"><strong>${card.label}</strong>${reviewed
          ? `<span class="locks-card__result"><b>${strengthLabel}.</b> ${card.explanation}</span>`
          : '<span>Нажми, чтобы проверить</span>'}</span>
      </button>`;
  }).join('');

  const phraseCards = PHRASE_CARDS.map((card) => {
    const selected = current.phraseCardIds.includes(card.id);
    const full = current.phraseCardIds.length === 3;
    return `
      <button class="locks-card locks-card--token${selected ? ' locks-card--selected' : ''}" type="button"
        data-action="ADD_PHRASE_CARD" data-phrase-card="${card.id}" aria-pressed="${selected}"
        ${selected || full ? 'disabled' : ''}>
        <span aria-hidden="true">${card.icon}</span><strong>${card.label}</strong>
      </button>`;
  }).join('');

  const phraseTokens = current.phraseCardIds.length === 0
    ? '<span class="locks-phrase__empty">Выбери три картинки</span>'
    : current.phraseCardIds.map((id, index) => {
      const card = PHRASE_CARDS.find((item) => item.id === id);
      return `${index ? '<span class="locks-phrase__separator" aria-hidden="true">—</span>' : ''}
        <span class="locks-phrase__token"><span aria-hidden="true">${card.icon}</span> ${card.label}</span>`;
    }).join('');

  const twoFactorSteps = TWO_FACTOR_STEPS.map((step) => {
    const selectedIndex = current.twoFactorStepIds.indexOf(step.id);
    const selected = selectedIndex >= 0;
    return `
      <button class="locks-card locks-card--step${selected ? ' locks-card--selected' : ''}" type="button"
        data-action="SELECT_2FA_STEP" data-2fa-step="${step.id}" aria-pressed="${selected}"
        ${selected || result.twoFactorComplete ? 'disabled' : ''}>
        <span class="locks-step__number" aria-hidden="true">${selected ? selectedIndex + 1 : '?'}</span>
        <span class="locks-card__icon" aria-hidden="true">${step.icon}</span><strong>${step.label}</strong>
      </button>`;
  }).join('');

  const hint = result.hint
    ? `<div class="locks-hint" data-2fa-hint role="status"><span aria-hidden="true">💡</span><p><strong>Попробуем ещё раз.</strong> ${result.hint}</p></div>`
    : '';

  return `
    <section class="locks-game" data-screen="locks">
      <div class="locks-game__intro">
        <p class="eyebrow">Замок секретов · Задание 2</p>
        <h1>Укрепи три замка</h1>
        <p class="lead">Всё здесь — вымышленная тренировка. Не вводи и не вспоминай свой настоящий пароль.</p>
      </div>

      <div class="locks-section" data-locks-stage="classify">
        <div class="locks-section__heading"><span aria-hidden="true">1</span><div><h2>Какой вариант сильнее?</h2>
          <p>Открой каждую учебную карточку и узнай, почему она слабая или более стойкая.</p></div></div>
        <div class="locks-card-grid locks-card-grid--passwords">${passwordCards}</div>
      </div>

      <div class="locks-section" data-locks-stage="phrase">
        <div class="locks-section__heading"><span aria-hidden="true">2</span><div><h2>Собери длинную учебную фразу</h2>
          <p>Выбери ровно три случайных образа. Это декоративный макет, а не настоящий пароль.</p></div></div>
        <div class="locks-phrase" data-assembled-phrase aria-label="Учебная фраза: ${current.phraseCardIds.length} из 3">${phraseTokens}</div>
        <p class="locks-progress" data-phrase-progress aria-live="polite">Выбрано: <strong>${current.phraseCardIds.length} из 3</strong></p>
        <div class="locks-card-grid locks-card-grid--tokens">${phraseCards}</div>
      </div>

      <div class="locks-section" data-locks-stage="two-factor">
        <div class="locks-section__heading"><span aria-hidden="true">3</span><div><h2>Поставь второй замок</h2>
          <p>Нажми шаги по порядку. Второй замок помогает, даже если кто-то узнал секретную фразу.</p></div></div>
        <div class="locks-card-grid locks-card-grid--steps">${twoFactorSteps}</div>
        ${hint}
        <p class="locks-progress" data-2fa-progress aria-live="polite">Замков открыто: <strong>${current.twoFactorStepIds.length} из 3</strong></p>
      </div>

      <p class="locks-privacy-note"><span aria-hidden="true">🛡️</span> В задании нет полей ввода. Учебная фраза не сохранится после выхода из замка.</p>
    </section>`;
}

function normalizeLocksState(state) {
  const source = state && typeof state === 'object' ? state : {};
  return {
    reviewedPasswordCardIds: uniqueAllowed(source.reviewedPasswordCardIds, PASSWORD_CARD_IDS),
    phraseCardIds: uniqueAllowed(source.phraseCardIds, PHRASE_CARD_IDS).slice(0, 3),
    twoFactorStepIds: orderedTwoFactorSteps(source.twoFactorStepIds),
    twoFactorHint: source.twoFactorHint === TWO_FACTOR_HINT ? TWO_FACTOR_HINT : null,
  };
}

function orderedTwoFactorSteps(values) {
  if (!Array.isArray(values)) return [];
  const result = [];
  for (const value of values) {
    const expected = TWO_FACTOR_STEPS[result.length]?.id;
    if (!TWO_FACTOR_STEP_IDS.has(value) || value !== expected) break;
    result.push(value);
  }
  return result;
}

function uniqueAllowed(values, allowed) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

function appendUnique(values, value) {
  return values.includes(value) ? values : [...values, value];
}
