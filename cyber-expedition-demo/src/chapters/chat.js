const CHAT_SKILLS = new Set(['protect-data', 'avoid-escalation', 'seek-help']);

export const CHAT_NODES = Object.freeze([
  {
    id: 'pass-request',
    author: 'Игрок Комета',
    avatar: '☄️',
    message: 'Привет! Пришли фото школьного пропуска — хочу проверить, что ты правда из нашей школы.',
    replies: [
      {
        id: 'refuse-photo',
        label: 'Нет, фото пропуска не отправлю.',
        nextNodeId: 'stranger-pressure',
        skill: 'protect-data',
        met: true,
      },
      {
        id: 'send-photo',
        label: 'Ладно, отправлю фото.',
        nextNodeId: 'photo-retry',
        skill: 'protect-data',
        met: false,
      },
    ],
  },
  {
    id: 'photo-retry',
    author: 'Тренер станции',
    avatar: '🛡️',
    message: 'Фото не отправлено. На пропуске могут быть имя, школа и другие личные данные.',
    guidance: 'Можно спокойно исправить выбор: личные документы остаются только у тебя и взрослых, которым ты доверяешь.',
    replies: [
      {
        id: 'correct-refusal',
        label: 'Исправить: фото не отправлю.',
        nextNodeId: 'stranger-pressure',
        skill: 'protect-data',
        met: true,
      },
    ],
  },
  {
    id: 'stranger-pressure',
    author: 'Игрок Комета',
    avatar: '☄️',
    message: 'Ну чего ты? Докажи, что не боишься. Только никому не рассказывай про наш разговор.',
    replies: [
      {
        id: 'stop-and-tell',
        label: 'Остановлю чат и покажу сообщение взрослому.',
        nextNodeId: null,
        finished: true,
        skill: 'seek-help',
        met: true,
      },
      {
        id: 'argue-back',
        label: 'Начну спорить и отвечу грубо.',
        nextNodeId: 'escalation-retry',
        skill: 'avoid-escalation',
        met: false,
      },
    ],
  },
  {
    id: 'escalation-retry',
    author: 'Тренер станции',
    avatar: '🛡️',
    message: 'Спор может сделать разговор ещё неприятнее. Тебе не нужно ничего доказывать незнакомцу.',
    guidance: 'Безопасный выход — остановить разговор, сохранить сообщение и обратиться за помощью.',
    replies: [
      {
        id: 'stop-and-tell',
        label: 'Остановлю чат и покажу сообщение взрослому.',
        nextNodeId: null,
        finished: true,
        skill: 'seek-help',
        met: true,
      },
    ],
  },
  {
    id: 'bullying-message',
    author: 'Группа класса',
    avatar: '💬',
    message: 'В чате начали дразнить одноклассника и зовут тебя написать что-нибудь обидное тоже.',
    replies: [
      {
        id: 'save-evidence',
        label: 'Не отвечу грубо и сохраню сообщение.',
        nextNodeId: 'bullying-help',
        skill: 'avoid-escalation',
        met: true,
      },
      {
        id: 'reply-rudely',
        label: 'Отвечу обидчикам ещё грубее.',
        nextNodeId: 'bullying-retry',
        skill: 'avoid-escalation',
        met: false,
      },
    ],
  },
  {
    id: 'bullying-retry',
    author: 'Тренер станции',
    avatar: '🛡️',
    message: 'Ответные обиды продолжают травлю. Лучше не вступать в перепалку и сохранить доказательство.',
    guidance: 'Попробуй ещё раз: неприятный выбор ничего не отправляет и не закрывает тренировку.',
    replies: [
      {
        id: 'save-evidence',
        label: 'Не отвечу грубо и сохраню сообщение.',
        nextNodeId: 'bullying-help',
        skill: 'avoid-escalation',
        met: true,
      },
    ],
  },
  {
    id: 'bullying-help',
    author: 'Тренер станции',
    avatar: '🛡️',
    message: 'Доказательство сохранено. Кому стоит показать ситуацию, чтобы остановить травлю?',
    replies: [
      {
        id: 'tell-adult',
        label: 'Покажу взрослому, которому доверяю.',
        nextNodeId: null,
        finished: true,
        skill: 'seek-help',
        met: true,
      },
    ],
  },
]);

export function getChatNode(id) {
  if (typeof id !== 'string') return null;
  return CHAT_NODES.find((node) => node.id === id) ?? null;
}

export function chooseChatReply(nodeId, replyId) {
  const node = getChatNode(nodeId);
  const reply = node?.replies.find((item) => item.id === replyId);
  if (!reply || !CHAT_SKILLS.has(reply.skill) || typeof reply.met !== 'boolean') return null;
  if (!reply.finished && !getChatNode(reply.nextNodeId)) return null;

  return {
    nextNodeId: reply.nextNodeId,
    finished: Boolean(reply.finished),
    choice: toChoice(node, reply),
  };
}

export function evaluateChatChoices(choices) {
  if (!Array.isArray(choices) || !choices.every(isValidChoice)) return null;

  const protectedData = choices.some((choice) => choice.skill === 'protect-data' && choice.met);
  const avoidedEscalation = choices.some((choice) => (
    (choice.skill === 'avoid-escalation' || choice.replyId === 'stop-and-tell') && choice.met
  ));
  const soughtHelp = choices.some((choice) => choice.skill === 'seek-help' && choice.met);
  const summary = protectedData && avoidedEscalation && soughtHelp
    ? 'Ты сохранил личные данные, остановил разговор и выбрал помощь взрослого.'
    : summaryFor({ protectedData, avoidedEscalation, soughtHelp });

  return { protectedData, avoidedEscalation, soughtHelp, summary };
}

export function renderChat(state) {
  const node = getChatNode(state?.nodeId) ?? getChatNode('pass-request');
  const history = validOfficialChoices(state?.history ?? state?.choices ?? []);

  return `
    <section class="chat-game" data-screen="chat">
      <div class="chat-game__heading">
        <p class="eyebrow">Станция общения · безопасный чат</p>
        <h1>Выбери спокойный ответ</h1>
        <p class="lead">Это вымышленная переписка. Ничего не печатай: выбирай только готовые ответы.</p>
      </div>

      <div class="chat-device" aria-label="Тренировочная переписка">
        <div class="chat-device__top" aria-hidden="true"><span>● ● ●</span><strong>Чат-тренажёр</strong><span>🛡️</span></div>
        <div class="chat-history" data-chat-history aria-live="polite">
          ${history.map(renderHistoryTurn).join('')}
          ${renderMessage(node)}
        </div>
        ${node.guidance ? `<div class="chat-guidance" data-chat-guidance><span aria-hidden="true">💡</span><p>${escapeHtml(node.guidance)}</p></div>` : ''}
        <div class="chat-replies" role="group" aria-label="Готовые варианты ответа">
          <p>Что выберешь?</p>
          ${node.replies.map((reply) => `
            <button class="chat-reply" type="button" data-action="CHOOSE_CHAT_REPLY"
              data-chat-node="${escapeHtml(node.id)}" data-chat-reply="${escapeHtml(reply.id)}">
              ${escapeHtml(reply.label)}
            </button>`).join('')}
        </div>
      </div>
      <p class="chat-privacy-note"><span aria-hidden="true">🔒</span> Здесь нет свободного ввода, настоящих контактов или активных ссылок.</p>
    </section>`;
}

export function renderChatResult(state) {
  const result = evaluateChatChoices(state?.choices ?? []) ?? {
    protectedData: false,
    avoidedEscalation: false,
    soughtHelp: false,
    summary: 'Тренировка завершена безопасным выходом из разговора.',
  };
  const skills = [
    ['protected-data', 'Личные данные защищены', result.protectedData, 'Ты не передал фото документа или другую личную информацию.'],
    ['avoided-escalation', 'Спор остановлен', result.avoidedEscalation, 'Ты не стал продолжать грубый или давящий разговор.'],
    ['sought-help', 'Помощь взрослого выбрана', result.soughtHelp, 'Ты решил показать ситуацию взрослому, которому доверяешь.'],
  ];

  return `
    <section class="chat-result" data-screen="reward">
      <div class="chat-result__hero" aria-hidden="true">💬 🛡️ ✨</div>
      <p class="eyebrow">Безопасный выход найден</p>
      <h1>Разговор под контролем</h1>
      <p class="lead" data-chat-summary>${escapeHtml(result.summary)}</p>

      <ul class="chat-skills" aria-label="Три навыка безопасного общения">
        ${skills.map(([id, title, met, description]) => `
          <li class="chat-skill${met ? ' chat-skill--met' : ''}" data-chat-skill="${id}" data-met="${met}">
            <span class="chat-skill__mark" aria-hidden="true">${met ? '✓' : '○'}</span>
            <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>
          </li>`).join('')}
      </ul>

      <p class="chat-disclosure" data-training-disclosure><strong>Тренировочный макет:</strong> все сообщения и имена вымышлены, ответы заданы заранее, данные никуда не отправляются.</p>
      <div class="chat-result__claim">
        <div class="shield-part" data-reward-part="help"><span aria-hidden="true">🧩</span><p>Часть щита<br><strong>«Помощь»</strong></p></div>
        <button class="button button--primary" type="button" data-action="CLAIM_REWARD">Вернуться на карту с щитом 4/4 <span aria-hidden="true">→</span></button>
      </div>
    </section>`;
}

function toChoice(node, reply) {
  return { nodeId: node.id, replyId: reply.id, skill: reply.skill, met: reply.met === true };
}

function isValidChoice(choice) {
  if (!choice || typeof choice !== 'object' || !CHAT_SKILLS.has(choice.skill) || typeof choice.met !== 'boolean') {
    return false;
  }
  const hasNodeIdentity = 'nodeId' in choice || 'replyId' in choice;
  if (!hasNodeIdentity) return true;
  if (typeof choice.nodeId !== 'string' || typeof choice.replyId !== 'string') return false;
  const node = getChatNode(choice.nodeId);
  const reply = node?.replies.find((item) => item.id === choice.replyId);
  return Boolean(reply && reply.skill === choice.skill && reply.met === choice.met);
}

function validOfficialChoices(choices) {
  if (!Array.isArray(choices)) return [];
  return choices.filter((choice) => (
    typeof choice?.nodeId === 'string'
    && typeof choice?.replyId === 'string'
    && isValidChoice(choice)
  ));
}

function renderHistoryTurn(choice) {
  const node = getChatNode(choice.nodeId);
  const reply = node?.replies.find((item) => item.id === choice.replyId);
  if (!node || !reply) return '';
  return `${renderMessage(node)}
    <article class="chat-message chat-message--child" data-chat-message="child">
      <span class="chat-message__avatar" aria-hidden="true">🙂</span>
      <div><p class="chat-message__author">Ты</p><p>${escapeHtml(reply.label)}</p></div>
    </article>`;
}

function renderMessage(node) {
  return `
    <article class="chat-message${node.author === 'Тренер станции' ? ' chat-message--coach' : ''}" data-chat-message="${escapeHtml(node.id)}">
      <span class="chat-message__avatar" aria-hidden="true">${node.avatar}</span>
      <div><p class="chat-message__author">${escapeHtml(node.author)}</p><p>${escapeHtml(node.message)}</p></div>
    </article>`;
}

function summaryFor(result) {
  const achieved = [
    result.protectedData ? 'сохранил личные данные' : null,
    result.avoidedEscalation ? 'не стал усиливать конфликт' : null,
    result.soughtHelp ? 'выбрал помощь взрослого' : null,
  ].filter(Boolean);
  return achieved.length
    ? `Ты ${achieved.join(', ')}.`
    : 'Попробуй ещё раз и найди спокойный безопасный выход.';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
