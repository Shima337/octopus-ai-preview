import assert from 'node:assert/strict';
import test from 'node:test';
import { getMediaModel } from '../src/media.js';

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
