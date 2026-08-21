import assert from 'node:assert/strict';
import test from 'node:test';
import { getMediaModel } from '../src/media.js';
import { createInitialState, transition } from '../src/lesson-state.js';
import { loadLesson, resetLesson, saveLesson } from '../src/storage.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('media uses a placeholder until a local source is configured', () => {
  assert.deepEqual(getMediaModel({ id: 'intro', source: null, audio: null }), {
    mode: 'placeholder', source: null, poster: null, captions: null, audio: null,
  });
});

test('media selects local video ahead of optional audio', () => {
  assert.deepEqual(getMediaModel({
    source: 'media/city-intro.mp4',
    poster: 'media/city-intro.webp',
    captions: 'media/city-intro.ru.vtt',
    audio: 'media/city-intro.ru.mp3',
  }), {
    mode: 'video',
    source: 'media/city-intro.mp4',
    poster: 'media/city-intro.webp',
    captions: 'media/city-intro.ru.vtt',
    audio: 'media/city-intro.ru.mp3',
  });
});

test('media selects audio when no local video is configured', () => {
  assert.deepEqual(getMediaModel({ audio: 'media/city-intro.ru.mp3' }), {
    mode: 'audio',
    source: null,
    poster: null,
    captions: null,
    audio: 'media/city-intro.ru.mp3',
  });
});

test('lesson storage returns a fresh state for corrupt JSON, unknown versions, and unavailable storage', () => {
  const corrupt = createMemoryStorage({ 'cyber-expedition-progress-v1': '{not-json' });
  const unknownVersion = createMemoryStorage({ 'cyber-expedition-progress-v1': '{"version":2}' });
  const unavailable = { getItem() { throw new Error('blocked'); } };

  for (const storage of [corrupt, unknownVersion, unavailable]) {
    assert.deepEqual(loadLesson(storage), createInitialState());
  }
});

test('lesson storage normalizes saved progress and recomputes derived rewards', () => {
  const state = {
    ...createInitialState(),
    mode: 'child',
    screen: 'map',
    completedDistricts: ['mirror', 'mirror', 'traps', 'unknown'],
    unlockedDistricts: ['messages'],
    shieldParts: ['help'],
    card: { rules: ['pause', 'pause', 'secret', 'adult'], adultRole: 'teacher', habit: 'check-photo' },
    injected: 'must not survive',
  };
  const storage = createMemoryStorage({ 'cyber-expedition-progress-v1': JSON.stringify(state) });

  const restored = loadLesson(storage);
  assert.deepEqual(restored.completedDistricts, ['mirror', 'traps']);
  assert.deepEqual(restored.unlockedDistricts, ['mirror', 'locks', 'traps']);
  assert.deepEqual(restored.shieldParts, ['privacy', 'check']);
  assert.deepEqual(restored.card, { rules: ['pause', 'secret', 'adult'], adultRole: 'teacher', habit: 'check-photo' });
  assert.equal('injected' in restored, false);
});

test('lesson storage saves and resets persisted progress', () => {
  const storage = createMemoryStorage();
  const state = { ...createInitialState(), mode: 'child', screen: 'map', completedDistricts: ['mirror'] };
  assert.equal(saveLesson(state, storage), true);
  assert.equal(loadLesson(storage).screen, 'map');
  assert.equal(resetLesson(storage), true);
  assert.deepEqual(loadLesson(storage), createInitialState());
});

test('lesson storage restores all preview districts as open and interactive', () => {
  const storage = createMemoryStorage();
  const preview = {
    ...createInitialState(),
    mode: 'preview',
    screen: 'map',
    unlockedDistricts: ['mirror', 'locks', 'traps', 'messages'],
  };

  assert.equal(saveLesson(preview, storage), true);
  const restored = loadLesson(storage);
  assert.deepEqual(restored.unlockedDistricts, ['mirror', 'locks', 'traps', 'messages']);
  assert.equal(
    transition(restored, { type: 'OPEN_DISTRICT', districtId: 'locks' }).screen,
    'locks-video',
  );
});

test('lesson storage preserves the messages media stage', () => {
  const storage = createMemoryStorage();
  const mediaState = {
    ...createInitialState(),
    mode: 'preview',
    screen: 'messages-video',
    activeDistrict: 'messages',
    unlockedDistricts: ['mirror', 'locks', 'traps', 'messages'],
  };

  assert.equal(saveLesson(mediaState, storage), true);
  const restored = loadLesson(storage);
  assert.equal(restored.screen, 'messages-video');
  assert.equal(restored.activeDistrict, 'messages');
});
