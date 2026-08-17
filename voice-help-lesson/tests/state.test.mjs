import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, transition } from '../src/lesson-state.js';

function firstScenarioState() {
  let state = createInitialState();
  state = transition(state, { type: 'START' });
  return transition(state, { type: 'ACCEPT_PRIVACY', mode: 'openai' });
}

test('privacy gate precedes the first scenario', () => {
  let state = createInitialState();
  state = transition(state, { type: 'START' });
  assert.equal(state.screen, 'privacy');
  state = transition(state, { type: 'ACCEPT_PRIVACY', mode: 'openai' });
  assert.equal(state.screen, 'scenario');
  assert.equal(state.scenarioIndex, 0);
  assert.equal(state.mode, 'openai');
});

test('transcript review replaces prior recognition text', () => {
  let state = firstScenarioState();
  state = transition(state, { type: 'SET_TRANSCRIPT', transcript: 'первый текст' });
  assert.equal(state.screen, 'transcript');
  state = transition(state, { type: 'SET_TRANSCRIPT', transcript: 'исправленный текст' });
  assert.equal(state.transcript, 'исправленный текст');
});

test('partial answer can be retried without losing found shield parts', () => {
  let state = firstScenarioState();
  state = transition(state, { type: 'SET_TRANSCRIPT', transcript: 'Мне попросили пароль' });
  state = transition(state, { type: 'CHECK_ANSWER', analysis: { found: ['signal'], missing: ['action', 'help'], complete: false } });
  assert.equal(state.screen, 'feedback');
  assert.deepEqual(state.currentParts, ['signal']);
  state = transition(state, { type: 'RETRY' });
  assert.equal(state.screen, 'scenario');
  assert.deepEqual(state.currentParts, ['signal']);
  assert.equal(state.attempts, 1);
});

test('example becomes available after two partial attempts and permits progress', () => {
  let state = firstScenarioState();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    state = transition(state, { type: 'SET_TRANSCRIPT', transcript: 'часть ответа' });
    state = transition(state, { type: 'CHECK_ANSWER', analysis: { found: ['signal'], missing: ['action', 'help'], complete: false } });
    if (attempt === 0) state = transition(state, { type: 'RETRY' });
  }
  assert.equal(state.exampleAvailable, true);
  state = transition(state, { type: 'USE_EXAMPLE', transcript: 'безопасный пример' });
  assert.equal(state.canContinue, true);
  state = transition(state, { type: 'CONTINUE' });
  assert.equal(state.scenarioIndex, 1);
  assert.deepEqual(state.completedScenarios, ['prize']);
});

test('three complete answers lead to final and restart clears everything', () => {
  let state = firstScenarioState();
  for (const id of ['prize', 'stranger', 'bullying']) {
    state = transition(state, { type: 'SET_TRANSCRIPT', transcript: 'полный ответ' });
    state = transition(state, { type: 'CHECK_ANSWER', analysis: { found: ['signal', 'action', 'help'], missing: [], complete: true } });
    state = transition(state, { type: 'CONTINUE' });
    assert.equal(state.completedScenarios.includes(id), true);
  }
  assert.equal(state.screen, 'final');
  assert.deepEqual(transition(state, { type: 'RESTART' }), createInitialState());
});
