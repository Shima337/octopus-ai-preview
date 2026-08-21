import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMirrorState,
  evaluateMirror,
  updateMirror,
} from '../src/chapters/mirror.js';
import {
  classifyPasswordCard,
  createLocksState,
  evaluateLocks,
  updateLocks,
} from '../src/chapters/locks.js';

test('safe post requires every identifying detail and a safe caption', () => {
  let state = createMirrorState();
  for (const detailId of ['school-sign', 'geotag', 'pass-card', 'house-number']) {
    state = updateMirror(state, { type: 'TOGGLE_DETAIL', detailId });
  }
  state = updateMirror(state, { type: 'CHOOSE_CAPTION', captionId: 'cat-day' });

  assert.deepEqual(evaluateMirror(state), {
    complete: true,
    found: 4,
    missed: [],
    safeCaption: true,
    hint: null,
  });
});

test('neutral details do not count and a partial answer gets one category hint', () => {
  const state = updateMirror(createMirrorState(), { type: 'TOGGLE_DETAIL', detailId: 'cat' });
  const result = evaluateMirror(state);

  assert.equal(result.complete, false);
  assert.equal(result.found, 0);
  assert.match(result.hint, /место|школ/i);
});

test('unsafe caption gets one place hint and remains recoverable', () => {
  let state = createMirrorState();
  for (const detailId of ['school-sign', 'geotag', 'pass-card', 'house-number']) {
    state = updateMirror(state, { type: 'TOGGLE_DETAIL', detailId });
  }
  state = updateMirror(state, { type: 'CHOOSE_CAPTION', captionId: 'after-school' });
  state = updateMirror(state, { type: 'SUBMIT_MIRROR' });

  assert.deepEqual(evaluateMirror(state), {
    complete: false,
    found: 4,
    missed: [],
    safeCaption: false,
    hint: 'Проверь, не выдаёт ли подпись место съёмки.',
  });

  state = updateMirror(state, { type: 'CHOOSE_CAPTION', captionId: 'cat-day' });
  assert.equal(state.submitted, false);
  assert.equal(evaluateMirror(state).complete, true);
});

test('mirror state keeps only allow-listed choices and submission status', () => {
  const initial = createMirrorState();
  const unknownDetail = updateMirror(initial, {
    type: 'TOGGLE_DETAIL', detailId: 'real-address', freeText: 'не сохранять',
  });
  const unknownCaption = updateMirror(unknownDetail, {
    type: 'CHOOSE_CAPTION', captionId: 'custom-caption', text: 'не сохранять',
  });
  const submitted = updateMirror(unknownCaption, { type: 'SUBMIT_MIRROR', payload: { private: true } });

  assert.deepEqual(initial, { selectedDetails: [], captionId: null, submitted: false });
  assert.deepEqual(submitted, { selectedDetails: [], captionId: null, submitted: true });
});

test('obvious training passwords are rejected without collecting user text', () => {
  assert.equal(classifyPasswordCard('digits'), 'weak');
  assert.equal(classifyPasswordCard('hero-name'), 'weak');
  assert.equal(classifyPasswordCard('long-random-phrase'), 'stronger');
  assert.equal(classifyPasswordCard('unknown-card'), null);
});

test('castle completes only after every card lesson, exactly three phrase tokens, and ordered 2FA', () => {
  let state = createLocksState();
  for (const cardId of ['digits', 'hero-name', 'long-random-phrase']) {
    state = updateLocks(state, { type: 'CLASSIFY_PASSWORD_CARD', cardId });
  }
  for (const cardId of ['rocket', 'forest', 'teacup', 'comet']) {
    state = updateLocks(state, { type: 'ADD_PHRASE_CARD', cardId });
  }
  assert.deepEqual(state.phraseCardIds, ['rocket', 'forest', 'teacup']);
  assert.equal(evaluateLocks(state).complete, false);

  for (const stepId of ['password', 'trusted-device', 'keep-code-secret']) {
    state = updateLocks(state, { type: 'SELECT_2FA_STEP', stepId });
  }

  assert.equal(evaluateLocks(state).complete, true);
  assert.equal('freeText' in state, false);
});

test('wrong 2FA order gives a calm hint and keeps completed earlier mini-games', () => {
  let state = createLocksState();
  for (const cardId of ['digits', 'hero-name', 'long-random-phrase']) {
    state = updateLocks(state, { type: 'CLASSIFY_PASSWORD_CARD', cardId });
  }
  for (const cardId of ['rocket', 'forest', 'teacup']) {
    state = updateLocks(state, { type: 'ADD_PHRASE_CARD', cardId });
  }
  state = updateLocks(state, { type: 'SELECT_2FA_STEP', stepId: 'trusted-device' });

  assert.deepEqual(state.reviewedPasswordCardIds, ['digits', 'hero-name', 'long-random-phrase']);
  assert.deepEqual(state.phraseCardIds, ['rocket', 'forest', 'teacup']);
  assert.deepEqual(state.twoFactorStepIds, []);
  assert.match(evaluateLocks(state).hint, /первый замок|секретной фраз/i);
});

test('locks state accepts allow-listed cards only and never stores submitted text', () => {
  let state = createLocksState();
  state = updateLocks(state, {
    type: 'CLASSIFY_PASSWORD_CARD', cardId: 'real-password', freeText: 'do not store',
  });
  state = updateLocks(state, {
    type: 'ADD_PHRASE_CARD', cardId: 'custom-token', text: 'do not store',
  });
  state = updateLocks(state, {
    type: 'SELECT_2FA_STEP', stepId: 'send-code-to-friend', code: '123456',
  });

  assert.deepEqual(state, createLocksState());
  assert.equal('freeText' in state, false);
});
