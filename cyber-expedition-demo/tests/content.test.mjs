import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DISTRICTS,
  SHIELD_PARTS,
  VIDEOS,
  getDistrict,
  getShieldPart,
  getVideo,
} from '../src/content.js';

test('showcase defines four districts, four shield parts, and five media slots', () => {
  assert.equal(DISTRICTS.length, 4);
  assert.deepEqual(DISTRICTS.map((item) => item.id), ['mirror', 'locks', 'traps', 'messages']);
  assert.equal(SHIELD_PARTS.length, 4);
  assert.equal(VIDEOS.length, 5);
});

test('only the supplied city introduction video is configured', () => {
  assert.deepEqual(getVideo('city-intro'), {
    id: 'city-intro',
    source: '/media/city-intro.mp4',
    poster: null,
    captions: '/media/city-intro.ru.vtt',
    audio: null,
  });
  assert.deepEqual(
    VIDEOS.filter((video) => video.source).map((video) => video.id),
    ['city-intro'],
  );
});

test('content contains no working URLs or prompts for real personal data', () => {
  const text = JSON.stringify({ DISTRICTS, VIDEOS, SHIELD_PARTS });
  assert.doesNotMatch(text, /https?:\/\//i);
  assert.doesNotMatch(text, /введи(?:те)? (?:свой|настоящ)/i);
});

test('content lookup helpers find the matching contract records or return null', () => {
  assert.equal(getDistrict('mirror'), DISTRICTS[0]);
  assert.equal(getVideo('city-intro'), VIDEOS[0]);
  assert.equal(getShieldPart('privacy'), SHIELD_PARTS[0]);
  assert.equal(getDistrict('unknown'), null);
  assert.equal(getVideo('unknown'), null);
  assert.equal(getShieldPart('unknown'), null);
});
