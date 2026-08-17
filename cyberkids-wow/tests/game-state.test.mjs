import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, transition } from '../src/game-state.js';

test('a safe path completes the selected mission exactly once', () => {
  let state = createInitialState();
  state = transition(state, { type: 'SELECT_MISSION', missionId: 'cybercat' });
  state = transition(state, { type: 'START' });
  state = transition(state, { type: 'TOGGLE_CLUE', clueId: 'unknown-sender' });
  state = transition(state, { type: 'TOGGLE_CLUE', clueId: 'urgency' });
  state = transition(state, { type: 'TOGGLE_CLUE', clueId: 'free-prize' });
  state = transition(state, { type: 'SUBMIT_CLUES' });
  state = transition(state, { type: 'CHOOSE_ACTION', actionId: 'tell-adult' });
  state = transition(state, { type: 'CONTINUE' });

  assert.equal(state.screen, 'reward');
  assert.deepEqual(state.completed, ['cybercat']);

  state = transition(state, { type: 'CONTINUE' });
  assert.deepEqual(state.completed, ['cybercat']);
});

test('an unsafe action gives supportive feedback and can be retried', () => {
  let state = {
    ...createInitialState(),
    screen: 'decision',
    missionId: 'cybercat',
  };

  state = transition(state, { type: 'CHOOSE_ACTION', actionId: 'open-link' });
  assert.equal(state.screen, 'feedback');
  assert.equal(state.lastAnswerCorrect, false);

  state = transition(state, { type: 'RETRY' });
  assert.equal(state.screen, 'decision');
  assert.equal(state.lastAnswerCorrect, null);
  assert.equal(state.missionId, 'cybercat');
});

test('home keeps earned progress while clearing the active mission', () => {
  const state = transition(
    { ...createInitialState(['digital-forest']), missionId: 'cybercat', screen: 'intro' },
    { type: 'HOME' },
  );

  assert.equal(state.screen, 'home');
  assert.equal(state.missionId, null);
  assert.deepEqual(state.completed, ['digital-forest']);
});

test('clue submission waits until every correct clue is found', () => {
  let state = {
    ...createInitialState(),
    screen: 'clues',
    missionId: 'cybercat',
    selectedClues: ['urgency'],
  };

  state = transition(state, { type: 'SUBMIT_CLUES' });
  assert.equal(state.screen, 'clues');
  assert.equal(state.clueHintVisible, true);
});
