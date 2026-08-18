import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, selectCases, transition } from '../src/lesson-state.js';

test('three selected places produce three cases with different risks', () => {
  const cases = selectCases(['games', 'messages', 'device']);
  assert.equal(cases.length, 3);
  assert.deepEqual(cases.map((item) => item.placeId), ['games', 'messages', 'device']);
  assert.equal(new Set(cases.map((item) => item.risk)).size, 3);
});

test('map requires at least three selected places', () => {
  let state = { ...createInitialState(), screen: 'map', selectedPlaces: ['games', 'videos'] };
  state = transition(state, { type: 'CONFIRM_MAP' });
  assert.equal(state.screen, 'map');
  assert.equal(state.mapHintVisible, true);
});

test('valid map enters the chat before the existing expedition', () => {
  let state = { ...createInitialState(), screen: 'map', selectedPlaces: ['games', 'messages', 'device'] };
  state = transition(state, { type: 'CONFIRM_MAP' });
  assert.equal(state.screen, 'chat');
  assert.equal(state.selectedCases.length, 3);

  state = transition({ ...state, screen: 'chat-result' }, { type: 'CONTINUE_CHAT' });
  assert.equal(state.screen, 'expedition-video');
});

test('chat stores validated choices and only finishes on a terminal reply', () => {
  let state = { ...createInitialState(), screen: 'chat' };
  const choice = { nodeId: 'gift', replyId: 'ask-why', safety: 'check' };
  state = transition(state, { type: 'CHAT_REPLY', nextNodeId: 'school-request', choice, finished: false });
  assert.equal(state.screen, 'chat');
  assert.equal(state.chatNodeId, 'school-request');
  assert.deepEqual(state.chatChoices, [choice]);

  const result = { signals: true, protectedData: true, soughtHelp: true, summary: 'Готово.' };
  state = transition(state, {
    type: 'CHAT_REPLY',
    nextNodeId: 'blocked',
    choice: { nodeId: 'school-request', replyId: 'stop-and-tell', safety: 'safe' },
    finished: true,
    result,
  });
  assert.equal(state.screen, 'chat-result');
  assert.deepEqual(state.chatResult, result);
});

test('live voice events store only normalized turns and status', () => {
  let state = { ...createInitialState(), screen: 'voice-prepare' };
  state = transition(state, { type: 'START_VOICE_LIVE' });
  assert.equal(state.voiceMode, 'live');
  state = transition(state, { type: 'SET_VOICE_STATUS', status: 'listening' });
  state = transition(state, { type: 'ADD_VOICE_TURN', turn: { role: 'user', text: '  Не открою ссылку.  ' } });
  assert.equal(state.voiceStatus, 'listening');
  assert.deepEqual(state.voiceTurns, [{ role: 'user', text: 'Не открою ссылку.' }]);

  const unchanged = transition(state, { type: 'ADD_VOICE_TURN', turn: { role: 'system', text: 'secret' } });
  assert.deepEqual(unchanged, state);
});

test('warmup records all six answers and awards awareness crystal', () => {
  let state = { ...createInitialState(), screen: 'warmup' };
  for (let index = 0; index < 6; index += 1) {
    state = transition(state, { type: 'WARMUP_ANSWER', answer: index === 0 ? 'safe' : 'danger' });
    state = transition(state, { type: 'NEXT_WARMUP' });
  }
  assert.equal(state.screen, 'warmup-result');
  assert.equal(state.warmupAnswers.length, 6);
  assert.deepEqual(state.crystals, ['awareness']);
});

test('unsafe case action can be retried without losing crystals', () => {
  let state = {
    ...createInitialState(),
    screen: 'case-decision',
    selectedPlaces: ['games', 'messages', 'device'],
    selectedCases: selectCases(['games', 'messages', 'device']).map((item) => item.id),
    crystals: ['awareness'],
  };
  state = transition(state, { type: 'CHOOSE_CASE_ACTION', actionId: 'claim-now' });
  assert.equal(state.screen, 'case-feedback');
  assert.equal(state.lastAnswerCorrect, false);
  state = transition(state, { type: 'RETRY_CASE' });
  assert.equal(state.screen, 'case-decision');
  assert.deepEqual(state.crystals, ['awareness']);
});

test('safe case completion adds one unique risk crystal', () => {
  let state = {
    ...createInitialState(),
    screen: 'case-decision',
    selectedPlaces: ['games', 'messages', 'device'],
    selectedCases: selectCases(['games', 'messages', 'device']).map((item) => item.id),
    crystals: ['awareness'],
  };
  state = transition(state, { type: 'CHOOSE_CASE_ACTION', actionId: 'tell-adult' });
  state = transition(state, { type: 'CONTINUE_CASE' });
  assert.deepEqual(state.crystals, ['awareness', 'scam']);
  assert.equal(state.caseIndex, 1);
});

test('the final expedition case enters one voice task before the shield', () => {
  const selectedCases = selectCases(['games', 'messages', 'device']).map((item) => item.id);
  let state = {
    ...createInitialState(),
    screen: 'case-feedback',
    selectedPlaces: ['games', 'messages', 'device'],
    selectedCases,
    caseIndex: 2,
    lastAnswerCorrect: true,
    crystals: ['awareness', 'scam', 'privacy'],
  };
  state = transition(state, { type: 'CONTINUE_CASE' });
  assert.equal(state.screen, 'voice-prepare');

  state = transition(state, { type: 'START_VOICE_DEMO' });
  assert.equal(state.screen, 'voice-live');
  assert.equal(state.voiceMode, 'demo');

  const evaluation = {
    signals: { met: true, feedback: 'Сигнал замечен.' },
    safeAction: { met: true, feedback: 'Действие выбрано.' },
    trustedAdult: { met: true, feedback: 'Взрослый выбран.' },
    summary: 'Щит готов.',
  };
  state = transition(state, { type: 'SET_VOICE_EVALUATION', evaluation });
  assert.equal(state.screen, 'voice-result');
  assert.deepEqual(state.voiceEvaluation, evaluation);
  state = transition(state, { type: 'CONTINUE_VOICE' });
  assert.equal(state.screen, 'shield');
});

test('shield accepts only the safe literal order', () => {
  let state = { ...createInitialState(), screen: 'shield' };
  state = transition(state, { type: 'SELECT_SHIELD_STEP', stepId: 'tell' });
  assert.equal(state.shieldHintVisible, true);
  assert.deepEqual(state.shieldSelected, []);

  for (const stepId of ['stop', 'dont', 'save', 'block', 'tell']) {
    state = transition(state, { type: 'SELECT_SHIELD_STEP', stepId });
  }
  assert.equal(state.screen, 'final-video');
  assert.deepEqual(state.shieldSelected, ['stop', 'dont', 'save', 'block', 'tell']);
});

test('restart clears the entire lesson', () => {
  const state = transition(
    { ...createInitialState(), screen: 'final', selectedPlaces: ['games'], crystals: ['awareness'] },
    { type: 'RESTART' },
  );
  assert.deepEqual(state, createInitialState());
});
