export class OpenAIServiceError extends Error {
  constructor(code) {
    super(code);
    this.name = 'OpenAIServiceError';
    this.code = code;
  }
}

const EVALUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['signals', 'safeAction', 'trustedAdult', 'summary'],
  properties: {
    signals: { $ref: '#/$defs/criterion' },
    safeAction: { $ref: '#/$defs/criterion' },
    trustedAdult: { $ref: '#/$defs/criterion' },
    summary: { type: 'string', minLength: 1, maxLength: 160 },
  },
  $defs: {
    criterion: {
      type: 'object',
      additionalProperties: false,
      required: ['met', 'feedback'],
      properties: {
        met: { type: 'boolean' },
        feedback: { type: 'string', minLength: 1, maxLength: 160 },
      },
    },
  },
};

const MENTOR_INSTRUCTIONS = `Ты доброжелательный цифровой наставник для ребёнка 7–10 лет. Говори только по-русски, коротко и спокойно. Используй одну вымышленную ситуацию: в игровом чате обещают подарок, торопят перейти по ссылке и просят секрет от аккаунта. Задай по очереди не более четырёх вопросов: что подозрительно, чего ребёнок не станет делать, какой безопасный шаг сделает сейчас, какому взрослому расскажет. Разрешено одно мягкое уточнение. Не проси, не угадывай и не повторяй реальные личные данные: имя, адрес, школу, телефон, логин, пароль или расписание. Не изображай мошенника. Заверши словами: «Спасибо, тренировка закончена. Нажми кнопку, чтобы увидеть разбор».`;

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return null;
}

function validText(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 160;
}

export function validateEvaluation(value) {
  if (!value || typeof value !== 'object' || !validText(value.summary)) return null;
  for (const key of ['signals', 'safeAction', 'trustedAdult']) {
    if (!value[key] || typeof value[key].met !== 'boolean' || !validText(value[key].feedback)) return null;
  }
  return {
    signals: { met: value.signals.met, feedback: value.signals.feedback.trim() },
    safeAction: { met: value.safeAction.met, feedback: value.safeAction.feedback.trim() },
    trustedAdult: { met: value.trustedAdult.met, feedback: value.trustedAdult.feedback.trim() },
    summary: value.summary.trim(),
  };
}

export function createOpenAIService({
  apiKey,
  realtimeModel = 'gpt-realtime-2.1',
  realtimeVoice = 'marin',
  evaluationModel = 'gpt-5-mini',
  fetchImpl = globalThis.fetch,
} = {}) {
  const key = apiKey?.trim();

  async function createRealtimeCall(sdp) {
    if (!key) throw new OpenAIServiceError('REALTIME_UNAVAILABLE');
    const form = new FormData();
    form.set('sdp', sdp);
    form.set('session', JSON.stringify({
      type: 'realtime',
      model: realtimeModel,
      instructions: MENTOR_INSTRUCTIONS,
      output_modalities: ['audio'],
      audio: {
        input: { transcription: { model: 'gpt-4o-mini-transcribe', language: 'ru' } },
        output: { voice: realtimeVoice },
      },
    }));
    try {
      const response = await fetchImpl('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      if (!response.ok) throw new OpenAIServiceError('REALTIME_UNAVAILABLE');
      const answer = await response.text();
      if (!answer.trim()) throw new OpenAIServiceError('REALTIME_UNAVAILABLE');
      return answer;
    } catch (error) {
      if (error instanceof OpenAIServiceError) throw error;
      throw new OpenAIServiceError('REALTIME_UNAVAILABLE');
    }
  }

  async function evaluateVoice(turns) {
    if (!key) throw new OpenAIServiceError('EVALUATION_UNAVAILABLE');
    try {
      const response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: evaluationModel,
          store: false,
          instructions: 'Оцени только три навыка в вымышленной тренировке ребёнка: заметил опасный сигнал, выбрал безопасное действие, назвал доверенного взрослого. Не оценивай речь, грамотность или уверенность. Ответь доброжелательно по-русски.',
          input: JSON.stringify(turns),
          text: { format: { type: 'json_schema', name: 'voice_safety_evaluation', strict: true, schema: EVALUATION_SCHEMA } },
        }),
      });
      if (!response.ok) throw new OpenAIServiceError('EVALUATION_UNAVAILABLE');
      const payload = await response.json();
      const text = extractOutputText(payload);
      if (!text) throw new OpenAIServiceError('EVALUATION_UNAVAILABLE');
      const evaluation = validateEvaluation(JSON.parse(text));
      if (!evaluation) throw new OpenAIServiceError('EVALUATION_UNAVAILABLE');
      return evaluation;
    } catch (error) {
      if (error instanceof OpenAIServiceError) throw error;
      throw new OpenAIServiceError('EVALUATION_UNAVAILABLE');
    }
  }

  return { createRealtimeCall, evaluateVoice };
}
