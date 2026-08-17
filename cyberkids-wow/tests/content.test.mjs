import test from 'node:test';
import assert from 'node:assert/strict';

import { MISSIONS } from '../src/missions.js';

test('the prototype offers three unique complete missions', () => {
  assert.deepEqual(
    MISSIONS.map((mission) => mission.id),
    ['cybercat', 'digital-forest', 'space-patrol'],
  );

  for (const mission of MISSIONS) {
    assert.ok(mission.title.length > 0);
    assert.ok(mission.intro.text.length > 0);
    assert.ok(mission.trap.clues.filter((clue) => clue.correct).length >= 2);
    assert.equal(mission.decision.actions.length, 3);
    assert.ok(mission.badge.name.length > 0);
    assert.ok(mission.rule.length > 0);
  }
});

test('every mission offers trusted-adult help and explains unsafe choices', () => {
  for (const mission of MISSIONS) {
    const adultAction = mission.decision.actions.find((action) => action.id === 'tell-adult');
    assert.equal(adultAction?.correct, true, mission.id);

    const unsafeActions = mission.decision.actions.filter((action) => !action.correct);
    assert.equal(unsafeActions.length, 2, mission.id);
    assert.ok(unsafeActions.every((action) => action.feedback.length >= 20), mission.id);
  }
});

test('mission copy contains no live web links', () => {
  const serialized = JSON.stringify(MISSIONS);
  assert.equal(/https?:\/\//i.test(serialized), false);
});
