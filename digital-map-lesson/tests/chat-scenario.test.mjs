import test from 'node:test';
import assert from 'node:assert/strict';

import { CHAT_START_ID, chooseChatReply, evaluateChatChoices, getChatNode } from '../src/chat-scenario.js';

test('safe reply closes the chat and protects all three skills', () => {
  assert.equal(CHAT_START_ID, 'gift');
  const step = chooseChatReply('gift', 'stop-and-tell');
  assert.deepEqual(step, {
    nextNodeId: 'blocked',
    choice: { nodeId: 'gift', replyId: 'stop-and-tell', safety: 'safe' },
    finished: true,
  });
  assert.deepEqual(evaluateChatChoices([step.choice]), {
    signals: true,
    protectedData: true,
    soughtHelp: true,
    summary: 'Ты ничего не сообщил, остановил разговор и позвал взрослого.',
  });
});

test('unsafe reply reveals a stronger warning instead of ending the lesson', () => {
  const first = chooseChatReply('gift', 'share-city');
  assert.deepEqual(first, {
    nextNodeId: 'school-request',
    choice: { nodeId: 'gift', replyId: 'share-city', safety: 'unsafe' },
    finished: false,
  });
  const second = chooseChatReply('school-request', 'keep-chatting');
  assert.equal(second.nextNodeId, 'alone-request');
  assert.equal(second.finished, false);
  assert.equal(evaluateChatChoices([first.choice, second.choice]).protectedData, false);
});

test('the last warning always offers a safe exit and produces useful partial feedback', () => {
  const node = getChatNode('alone-request');
  assert.equal(node.replies.some((reply) => reply.id === 'stop-and-tell'), true);
  const choices = [
    { nodeId: 'gift', replyId: 'share-city', safety: 'unsafe' },
    { nodeId: 'school-request', replyId: 'stop-and-tell', safety: 'safe' },
  ];
  assert.deepEqual(evaluateChatChoices(choices), {
    signals: true,
    protectedData: false,
    soughtHelp: true,
    summary: 'Ты остановил разговор и позвал взрослого. В следующий раз не сообщай даже город или школу.',
  });
});

test('unknown nodes and forged reply ids cannot change the scenario', () => {
  assert.equal(getChatNode('missing'), null);
  assert.equal(chooseChatReply('gift', 'missing'), null);
  assert.equal(chooseChatReply('blocked', 'stop-and-tell'), null);
});
