export const CHAT_START_ID = 'gift';

const NODES = [
  {
    id: 'gift',
    sender: 'Player_X7',
    message: 'Привет! Я видел тебя в игре. Хочешь редкий подарок? Напиши, из какого ты города — проверю, доступен ли он тебе.',
    signal: 'Незнакомец обещает подарок и сразу просит личную информацию.',
    replies: [
      { id: 'share-city', label: 'Я из небольшого города рядом со столицей', safety: 'unsafe', nextNodeId: 'school-request' },
      { id: 'ask-why', label: 'А зачем тебе знать мой город?', safety: 'check', nextNodeId: 'school-request' },
      { id: 'stop-and-tell', label: 'Я не сообщаю личные данные. Покажу чат взрослому', safety: 'safe', nextNodeId: 'blocked' },
    ],
  },
  {
    id: 'school-request',
    sender: 'Player_X7',
    message: 'Да это просто проверка! Тогда пришли фото школы или напиши её название. Только быстрее — подарок скоро исчезнет.',
    signal: 'Собеседник просит данные о школе и торопит.',
    replies: [
      { id: 'share-school', label: 'Хорошо, напишу название школы', safety: 'unsafe', nextNodeId: 'alone-request' },
      { id: 'keep-chatting', label: 'Фото не пришлю, но давай ещё поговорим', safety: 'check', nextNodeId: 'alone-request' },
      { id: 'stop-and-tell', label: 'Нет. Закрываю чат и рассказываю взрослому', safety: 'safe', nextNodeId: 'blocked' },
    ],
  },
  {
    id: 'alone-request',
    sender: 'Player_X7',
    message: 'Ладно, последний вопрос: когда ты обычно играешь один, без взрослых? Тогда я пришлю подарок точно вовремя.',
    signal: 'Незнакомец пытается узнать расписание и когда рядом нет взрослых.',
    replies: [
      { id: 'share-schedule', label: 'Обычно я играю один после уроков', safety: 'unsafe', nextNodeId: 'blocked' },
      { id: 'refuse-only', label: 'Не скажу, это личное', safety: 'check', nextNodeId: 'blocked' },
      { id: 'stop-and-tell', label: 'Блокирую чат и показываю его взрослому', safety: 'safe', nextNodeId: 'blocked' },
    ],
  },
  {
    id: 'blocked',
    terminal: true,
    sender: 'Система безопасности',
    message: 'Диалог завершён. Незнакомец больше не может писать.',
    replies: [],
  },
];

const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]));

export function getChatNode(nodeId) {
  return NODE_BY_ID.get(nodeId) ?? null;
}

export function chooseChatReply(nodeId, replyId) {
  const node = getChatNode(nodeId);
  if (!node || node.terminal) return null;
  const reply = node.replies.find((item) => item.id === replyId);
  if (!reply) return null;
  return {
    nextNodeId: reply.nextNodeId,
    choice: { nodeId, replyId, safety: reply.safety },
    finished: getChatNode(reply.nextNodeId)?.terminal === true,
  };
}

export function evaluateChatChoices(choices) {
  const safeChoices = Array.isArray(choices) ? choices.filter((choice) => choice && ['safe', 'check', 'unsafe'].includes(choice.safety)) : [];
  const protectedData = !safeChoices.some((choice) => choice.safety === 'unsafe');
  const soughtHelp = safeChoices.some((choice) => choice.replyId === 'stop-and-tell');
  const signals = safeChoices.some((choice) => choice.safety !== 'unsafe');
  let summary = 'Ты увидел тренировочный пример. В настоящем чате ничего не сообщай и сразу позови взрослого.';
  if (protectedData && soughtHelp) summary = 'Ты ничего не сообщил, остановил разговор и позвал взрослого.';
  else if (!protectedData && soughtHelp) summary = 'Ты остановил разговор и позвал взрослого. В следующий раз не сообщай даже город или школу.';
  else if (protectedData) summary = 'Ты сохранил данные в секрете. Следующий шаг — закрыть чат и позвать взрослого.';
  return { signals, protectedData, soughtHelp, summary };
}
