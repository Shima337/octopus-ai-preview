import test from 'node:test';
import assert from 'node:assert/strict';

import { VOICE_SCENARIO, evaluateDemoVoice, getDemoMentorTurn, getDemoReplyOptions } from '../src/voice-scenario.js';

test('voice scenario is fixed, fictional, and contains no request for real data', () => {
  assert.match(VOICE_SCENARIO.message, /подарок/i);
  assert.match(VOICE_SCENARIO.privacyReminder, /вымышлен/i);
  assert.equal(VOICE_SCENARIO.questions.length, 4);
  assert.doesNotMatch(`${VOICE_SCENARIO.message} ${VOICE_SCENARIO.questions.join(' ')}`, /твой адрес|назови школу|номер телефона/i);
});

test('demo exposes three bounded mentor turns and preset replies', () => {
  assert.deepEqual(getDemoMentorTurn(0), { role: 'assistant', text: 'Что в этом сообщении кажется тебе подозрительным?' });
  assert.equal(getDemoReplyOptions(0).some((reply) => reply.id === 'spot-secret'), true);
  assert.equal(getDemoReplyOptions(1).some((reply) => reply.id === 'refuse-link'), true);
  assert.equal(getDemoReplyOptions(2).some((reply) => reply.id === 'tell-adult'), true);
  assert.equal(getDemoMentorTurn(3), null);
  assert.deepEqual(getDemoReplyOptions(3), []);
});

test('safe demo answers satisfy all three evaluation criteria', () => {
  const evaluation = evaluateDemoVoice([
    { role: 'user', text: 'Меня торопят и просят секрет от аккаунта.' },
    { role: 'user', text: 'Не открою ссылку и ничего не отправлю.' },
    { role: 'user', text: 'Покажу сообщение маме или учителю.' },
  ]);
  assert.equal(evaluation.signals.met, true);
  assert.equal(evaluation.safeAction.met, true);
  assert.equal(evaluation.trustedAdult.met, true);
  assert.equal(evaluation.summary, 'Ты заметил опасность, выбрал безопасный шаг и позвал взрослого. Отличная работа!');
});

test('partial or unrelated answers receive specific neutral reminders', () => {
  const evaluation = evaluateDemoVoice([{ role: 'user', text: 'Подарок выглядит странно.' }]);
  assert.equal(evaluation.signals.met, true);
  assert.equal(evaluation.safeAction.met, false);
  assert.equal(evaluation.trustedAdult.met, false);
  assert.match(evaluation.safeAction.feedback, /не открывать/i);
  assert.match(evaluation.trustedAdult.feedback, /взросл/i);
  assert.doesNotMatch(evaluation.summary, /плохо|провал/i);
});
