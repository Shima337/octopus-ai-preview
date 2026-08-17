import test from 'node:test';
import assert from 'node:assert/strict';

import { CASES, PLACES, SHIELD_STEPS, VIDEOS, WARMUP_CARDS } from '../src/content.js';

test('lesson content covers six places, six warmups, five videos, and five shield steps', () => {
  assert.deepEqual(PLACES.map((item) => item.id), ['videos', 'games', 'messages', 'search', 'school', 'device']);
  assert.equal(WARMUP_CARDS.length, 6);
  assert.equal(VIDEOS.length, 5);
  assert.deepEqual(SHIELD_STEPS.map((item) => item.id), ['stop', 'dont', 'save', 'block', 'tell']);
});

test('every place has a complete case with exactly one safe action', () => {
  for (const place of PLACES) {
    const placeCases = CASES.filter((item) => item.placeId === place.id);
    assert.ok(placeCases.length >= 1, place.id);
    for (const caseItem of placeCases) {
      assert.ok(caseItem.clues.filter((clue) => clue.correct).length >= 2, caseItem.id);
      assert.equal(caseItem.actions.length, 3, caseItem.id);
      assert.equal(caseItem.actions.filter((action) => action.correct).length, 1, caseItem.id);
      assert.ok(caseItem.actions.filter((action) => !action.correct).every((action) => action.feedback.length >= 20));
    }
  }
});

test('lesson data contains no live web links or personal-data prompts', () => {
  const copy = JSON.stringify({ CASES, PLACES, VIDEOS, WARMUP_CARDS });
  assert.equal(/https?:\/\//i.test(copy), false);
  assert.equal(/введи (имя|ник|адрес|школ)/i.test(copy), false);
});
