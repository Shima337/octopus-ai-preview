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
