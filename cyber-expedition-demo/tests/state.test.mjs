import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, stateForPreview, transition } from '../src/lesson-state.js';

test('child route unlocks districts sequentially', () => {
  let state = transition(createInitialState(), { type: 'CHOOSE_MODE', mode: 'child' });
  assert.equal(state.screen, 'intro-video');
  state = transition(state, { type: 'SKIP_MEDIA' });
  assert.equal(state.screen, 'map');
  assert.deepEqual(state.unlockedDistricts, ['mirror']);
});

test('reviewer can open every major activity with valid prerequisites', () => {
  const expected = {
    home: 'welcome', map: 'map', mirror: 'mirror-video', locks: 'locks-video',
    traps: 'traps-video', chat: 'chat', voice: 'voice-prepare', card: 'safety-card',
  };
  for (const [stage, screen] of Object.entries(expected)) {
    const state = stateForPreview(stage);
    assert.equal(state.screen, screen);
    assert.equal(state.mode, stage === 'home' ? null : 'preview');
  }
});

test('card preview seeds valid card selections for reviewer navigation', () => {
  assert.deepEqual(stateForPreview('card').card, {
    rules: ['pause', 'secret', 'adult'],
    adultRole: 'teacher',
    habit: 'check-photo',
  });
});

test('finishing a chapter awards one part and unlocks the next district', () => {
  let state = transition(stateForPreview('mirror'), { type: 'SKIP_MEDIA' });
  state = transition(state, { type: 'COMPLETE_CHAPTER', districtId: 'mirror' });
  assert.deepEqual(state.shieldParts, ['privacy']);
  assert.ok(state.unlockedDistricts.includes('locks'));
  assert.equal(state.screen, 'reward');
});

test('route events are ignored outside their active screen and preview jumps require preview mode', () => {
  const initial = createInitialState();
  assert.equal(transition(initial, { type: 'OPEN_DISTRICT', districtId: 'mirror' }), initial);

  const child = transition(initial, { type: 'CHOOSE_MODE', mode: 'child' });
  assert.equal(transition(child, { type: 'JUMP_TO_PREVIEW', stage: 'card' }), child);

  const preview = transition(initial, { type: 'CHOOSE_MODE', mode: 'preview' });
  const card = transition(preview, { type: 'JUMP_TO_PREVIEW', stage: 'card' });
  assert.equal(card.screen, 'safety-card');
  assert.equal(transition(card, { type: 'COMPLETE_CHAPTER', districtId: 'mirror' }), card);
});

test('voice completion unlocks the final card only from the voice result', () => {
  let state = transition(stateForPreview('voice'), { type: 'OPEN_VOICE', mode: 'demo' });
  assert.equal(state.screen, 'voice-live');
  state = transition(state, { type: 'COMPLETE_VOICE', evaluation: { safe: true } });
  assert.equal(state.screen, 'voice-result');
  state = transition(state, { type: 'OPEN_CARD' });
  assert.equal(state.screen, 'safety-card');
  assert.deepEqual(state.shieldParts, ['privacy', 'secret', 'check', 'help']);
});

test('card updates accept only known choices and preserve a maximum of three rules', () => {
  const state = stateForPreview('card');
  const updated = transition(state, {
    type: 'UPDATE_CARD',
    card: { rules: ['pause', 'secret', 'unknown', 'adult'], adultRole: 'unknown', habit: 'check-photo' },
  });
  assert.deepEqual(updated.card, {
    rules: ['pause', 'secret', 'adult'], adultRole: null, habit: 'check-photo',
  });
});
