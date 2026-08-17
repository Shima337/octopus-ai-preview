import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../src/lesson-state.js';
import { loadLesson, resetLesson, saveLesson } from '../src/storage.js';
import { getVideoModel } from '../src/video.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test('valid lesson state saves and restores', () => {
  const storage = memoryStorage();
  const state = { ...createInitialState(), screen: 'map', selectedPlaces: ['games', 'messages', 'device'], crystals: ['awareness'] };
  assert.equal(saveLesson(state, storage), true);
  assert.deepEqual(loadLesson(storage), state);
});

test('corrupt, unknown, and unavailable storage start a fresh lesson', () => {
  const corrupt = memoryStorage({ 'digital-map-lesson.v1': '{bad' });
  const unknown = memoryStorage({ 'digital-map-lesson.v1': JSON.stringify({ ...createInitialState(), screen: 'unknown' }) });
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadLesson(corrupt), createInitialState());
  assert.deepEqual(loadLesson(unknown), createInitialState());
  assert.deepEqual(loadLesson(broken), createInitialState());
  assert.equal(saveLesson(createInitialState(), broken), false);
  assert.equal(resetLesson(broken), false);
});

test('video model falls back cleanly and accepts a supplied local file', () => {
  const video = { id: 'digital-day', title: 'Один цифровой день', goal: 'Заметить места', duration: '60 секунд', source: null, captions: null };
  assert.deepEqual(getVideoModel(video), { mode: 'placeholder', video });
  assert.deepEqual(
    getVideoModel(video, { 'digital-day': { source: './videos/digital-day.mp4', captions: './videos/digital-day.vtt' } }),
    { mode: 'player', video, source: './videos/digital-day.mp4', captions: './videos/digital-day.vtt' },
  );
});
