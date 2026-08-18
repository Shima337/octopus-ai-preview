export const VOICE_SCENARIO = {
  title: 'Объясни цифровому наставнику',
  message: 'В игровом чате обещают редкий подарок, торопят перейти по ссылке и просят секрет от аккаунта.',
  privacyReminder: 'Говори только о вымышленной истории. Не называй настоящее имя, адрес, школу, телефон, логин или пароль.',
  questions: [
    'Что в сообщении показалось подозрительным?',
    'Что ты не станешь делать?',
    'Какой безопасный шаг сделаешь сейчас?',
    'Кому расскажешь об этом?',
  ],
  criteria: {
    signals: 'Заметил опасный сигнал',
    safeAction: 'Выбрал безопасное действие',
    trustedAdult: 'Позвал доверенного взрослого',
  },
};

const DEMO_TURNS = [
  {
    role: 'assistant',
    text: 'Что в этом сообщении кажется тебе подозрительным?',
    replies: [
      { id: 'spot-secret', text: 'Меня торопят и просят секрет от аккаунта.' },
      { id: 'only-gift', text: 'Наверное, странно, что подарок бесплатный.' },
      { id: 'not-sure', text: 'Пока не знаю, что здесь опасного.' },
    ],
  },
  {
    role: 'assistant',
    text: 'Хорошо. Что ты точно не станешь делать и какой шаг выберешь?',
    replies: [
      { id: 'refuse-link', text: 'Не открою ссылку, ничего не отправлю и закрою чат.' },
      { id: 'open-only', text: 'Открою ссылку, но секрет не напишу.' },
      { id: 'wait', text: 'Пока просто продолжу переписываться.' },
    ],
  },
  {
    role: 'assistant',
    text: 'Кому ты покажешь такое сообщение?',
    replies: [
      { id: 'tell-adult', text: 'Покажу сообщение маме, папе или учителю.' },
      { id: 'tell-friend', text: 'Расскажу только другу из игры.' },
      { id: 'tell-no-one', text: 'Никому не расскажу.' },
    ],
  },
];

export function getDemoMentorTurn(index) {
  const turn = DEMO_TURNS[index];
  return turn ? { role: turn.role, text: turn.text } : null;
}

export function getDemoReplyOptions(index) {
  return DEMO_TURNS[index]?.replies.map((reply) => ({ ...reply })) ?? [];
}

function normalizedUserText(turns) {
  return (Array.isArray(turns) ? turns : [])
    .filter((turn) => turn?.role === 'user' && typeof turn.text === 'string')
    .map((turn) => turn.text.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е'))
    .join(' ');
}

function containsAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function evaluateDemoVoice(turns) {
  const text = normalizedUserText(turns);
  const signalsMet = containsAny(text, ['тороп', 'секрет', 'парол', 'подозр', 'странн', 'ссылк', 'подар']);
  const safeActionMet = containsAny(text, ['не откр', 'не наж', 'не отправ', 'не сообщ', 'закро', 'заблок', 'останов']);
  const trustedAdultMet = containsAny(text, ['взросл', 'мам', 'пап', 'родител', 'учител', 'бабуш', 'дедуш']);
  const metCount = [signalsMet, safeActionMet, trustedAdultMet].filter(Boolean).length;
  const summaries = [
    'Начни с трёх шагов: заметь сигнал, остановись и позови взрослого.',
    'Один шаг уже готов. Добавь безопасное действие и помощь взрослого.',
    'Два шага щита уже готовы. Вспомни ещё один безопасный шаг.',
    'Ты заметил опасность, выбрал безопасный шаг и позвал взрослого. Отличная работа!',
  ];
  return {
    signals: {
      met: signalsMet,
      feedback: signalsMet ? 'Ты заметил, что подарок, спешка или просьба о секрете требуют остановиться.' : 'Стоит назвать сигнал: подарок, спешку, ссылку или просьбу о секрете.',
    },
    safeAction: {
      met: safeActionMet,
      feedback: safeActionMet ? 'Ты решил не открывать ссылку и ничего не отправлять.' : 'Стоит сказать: не открывать ссылку, ничего не отправлять и закрыть чат.',
    },
    trustedAdult: {
      met: trustedAdultMet,
      feedback: trustedAdultMet ? 'Ты выбрал взрослого, которому можно показать сообщение.' : 'Ещё назови доверенного взрослого: родителя, учителя или другого близкого взрослого.',
    },
    summary: summaries[metCount],
  };
}
