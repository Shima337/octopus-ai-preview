import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../src/lesson-state.js';
import { loadLesson, resetLesson, saveLesson } from '../src/storage.js';
import { getVideoModel } from '../src/video.js';
import { VoiceApiError, createVoiceApi } from '../src/voice-api.js';

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

test('version one progress migrates to version two without losing the map', () => {
  const legacy = {
    version: 1,
    screen: 'map',
    warmupIndex: 5,
    warmupAnswers: [],
    warmupFeedback: null,
    selectedPlaces: ['games', 'messages', 'device'],
    selectedCases: [],
    caseIndex: 0,
    selectedClues: [],
    clueHintVisible: false,
    mapHintVisible: false,
    lastActionId: null,
    lastAnswerCorrect: null,
    crystals: ['awareness'],
    shieldSelected: [],
    shieldHintVisible: false,
  };
  const storage = memoryStorage({ 'digital-map-lesson.v1': JSON.stringify(legacy) });
  const loaded = loadLesson(storage);
  assert.equal(loaded.version, 2);
  assert.equal(loaded.screen, 'map');
  assert.deepEqual(loaded.selectedPlaces, ['games', 'messages', 'device']);
  assert.deepEqual(loaded.crystals, ['awareness']);
  assert.deepEqual(loaded.chatChoices, []);
  assert.equal(loaded.voiceMode, null);
});

test('reset removes current and legacy lesson progress', () => {
  const storage = memoryStorage({
    'digital-map-lesson.v1': '{}',
    'digital-map-lesson.v2': '{}',
  });
  assert.equal(resetLesson(storage), true);
  assert.equal(storage.getItem('digital-map-lesson.v1'), null);
  assert.equal(storage.getItem('digital-map-lesson.v2'), null);
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

test('voice API reads mode, exchanges SDP, and returns validated evaluation payload', async () => {
  const evaluation = {
    signals: { met: true, feedback: 'Сигнал замечен.' },
    safeAction: { met: true, feedback: 'Безопасный шаг выбран.' },
    trustedAdult: { met: false, feedback: 'Назови взрослого.' },
    summary: 'Два шага готовы.',
  };
  const calls = [];
  const api = createVoiceApi({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (url.endsWith('/api/health')) return Response.json({ ok: true, realtime: 'openai' });
      if (url.endsWith('/api/realtime/session')) return new Response('answer-sdp', { headers: { 'content-type': 'application/sdp' } });
      return Response.json({ ok: true, evaluation });
    },
  });
  assert.deepEqual(await api.health(), { realtime: 'openai' });
  assert.equal(await api.createSession('offer-sdp'), 'answer-sdp');
  assert.deepEqual(await api.evaluate([{ role: 'user', text: 'Позову взрослого.' }]), evaluation);
  assert.equal(calls[1].options.headers['content-type'], 'application/sdp');
  assert.deepEqual(JSON.parse(calls[2].options.body), { turns: [{ role: 'user', text: 'Позову взрослого.' }] });
});

test('voice API maps unavailable and malformed responses to local error codes', async () => {
  const demo = createVoiceApi({ fetchImpl: async () => Response.json({ ok: true, realtime: 'demo' }) });
  assert.deepEqual(await demo.health(), { realtime: 'demo' });

  const failed = createVoiceApi({ fetchImpl: async () => new Response('upstream secret', { status: 503 }) });
  await assert.rejects(() => failed.createSession('offer'), (error) => error instanceof VoiceApiError && error.code === 'SESSION_FAILED' && !error.message.includes('secret'));

  const malformed = createVoiceApi({ fetchImpl: async () => Response.json({ ok: true, evaluation: { summary: 'missing' } }) });
  await assert.rejects(() => malformed.evaluate([{ role: 'user', text: 'Ответ' }]), (error) => error instanceof VoiceApiError && error.code === 'EVALUATION_FAILED');
});
