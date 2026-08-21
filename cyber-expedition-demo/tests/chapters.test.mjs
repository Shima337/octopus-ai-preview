import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMirrorState,
  evaluateMirror,
  updateMirror,
} from '../src/chapters/mirror.js';

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
