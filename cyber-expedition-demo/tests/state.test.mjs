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
    traps: 'traps-video', chat: 'chat',
  };
  for (const [stage, screen] of Object.entries(expected)) {
    const state = stateForPreview(stage);
    assert.equal(state.screen, screen);
    assert.equal(state.mode, stage === 'home' ? null : 'preview');
  }
  assert.equal(stateForPreview('voice'), null);
  assert.equal(stateForPreview('card'), null);
});

test('finishing a chapter awards one part and unlocks the next district', () => {
  let state = transition(stateForPreview('mirror'), { type: 'SKIP_MEDIA' });
  state = transition(state, { type: 'COMPLETE_CHAPTER', districtId: 'mirror' });
  assert.deepEqual(state.shieldParts, ['privacy']);
  assert.ok(state.unlockedDistricts.includes('locks'));
  assert.equal(state.screen, 'reward');
});

test('finishing a preview chapter keeps every district unlocked through the reward return', () => {
  let state = transition(stateForPreview('mirror'), { type: 'SKIP_MEDIA' });
  state = transition(state, { type: 'COMPLETE_CHAPTER', districtId: 'mirror' });
  assert.deepEqual(state.unlockedDistricts, ['mirror', 'locks', 'traps', 'messages']);

  state = transition(state, { type: 'RETURN_TO_MAP' });
  assert.equal(state.screen, 'map');
  assert.deepEqual(state.unlockedDistricts, ['mirror', 'locks', 'traps', 'messages']);
});

test('route events are ignored outside their active screen and preview jumps require preview mode', () => {
  const initial = createInitialState();
  assert.equal(transition(initial, { type: 'OPEN_DISTRICT', districtId: 'mirror' }), initial);

  const child = transition(initial, { type: 'CHOOSE_MODE', mode: 'child' });
  assert.equal(transition(child, { type: 'JUMP_TO_PREVIEW', stage: 'card' }), child);

  const preview = transition(initial, { type: 'CHOOSE_MODE', mode: 'preview' });
  for (const stage of ['voice', 'card']) {
    assert.equal(transition(preview, { type: 'JUMP_TO_PREVIEW', stage }), preview);
  }
});

test('messages district opens its media stage before continuing to chat', () => {
  const map = stateForPreview('map');
  const media = transition(map, { type: 'OPEN_DISTRICT', districtId: 'messages' });
  assert.equal(media.screen, 'messages-video');
  assert.equal(media.activeDistrict, 'messages');

  const chat = transition(media, { type: 'SKIP_MEDIA' });
  assert.equal(chat.screen, 'chat');
  assert.equal(chat.activeDistrict, 'messages');
});
