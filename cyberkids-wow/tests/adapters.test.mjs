import test from 'node:test';
import assert from 'node:assert/strict';

import { loadProgress, resetProgress, saveProgress } from '../src/storage.js';
import { canSpeak, speak, stopSpeaking } from '../src/speech.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
}

test('progress storage keeps only known unique mission ids', () => {
  const storage = memoryStorage({
    'cybermissions.completed.v1': JSON.stringify(['cybercat', 'unknown', 'cybercat', 'space-patrol']),
  });

  assert.deepEqual(loadProgress(storage), ['cybercat', 'space-patrol']);
});

test('progress storage survives unavailable browser storage', () => {
  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };

  assert.deepEqual(loadProgress(brokenStorage), []);
  assert.equal(saveProgress(['cybercat'], brokenStorage), false);
  assert.equal(resetProgress(brokenStorage), false);
});

test('progress can be saved and reset', () => {
  const storage = memoryStorage();
  assert.equal(saveProgress(['digital-forest'], storage), true);
  assert.deepEqual(loadProgress(storage), ['digital-forest']);
  assert.equal(resetProgress(storage), true);
  assert.deepEqual(loadProgress(storage), []);
});

test('speech adapter is optional and configures Russian narration', () => {
  assert.equal(canSpeak({}), false);
  assert.equal(speak('Привет', {}), false);

  const events = [];
  class Utterance {
    constructor(text) { this.text = text; }
  }
  const browserWindow = {
    SpeechSynthesisUtterance: Utterance,
    speechSynthesis: {
      cancel() { events.push('cancel'); },
      speak(utterance) { events.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate }); },
    },
  };

  assert.equal(canSpeak(browserWindow), true);
  assert.equal(speak('Проверим сообщение', browserWindow), true);
  stopSpeaking(browserWindow);
  assert.deepEqual(events, [
    'cancel',
    { text: 'Проверим сообщение', lang: 'ru-RU', rate: 0.92 },
    'cancel',
  ]);
});
