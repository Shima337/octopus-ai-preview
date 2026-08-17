import assert from 'node:assert/strict';
import test from 'node:test';
import { SCENARIOS } from '../src/content.js';
import { analyzeAnswer, normalizeText } from '../src/analyzer.js';

test('normalization handles Russian case, punctuation, and ё', () => {
  assert.equal(normalizeText('Я НИЧЕГО не отправил, всё проверю!'), 'я ничего не отправил все проверю');
});

test('a child-like complete answer finds all three shield parts', () => {
  const result = analyzeAnswer(
    'Мне попросили пароль. Я ничего не нажала и хочу показать это взрослому.',
    SCENARIOS[0],
  );
  assert.deepEqual(result.found, ['signal', 'action', 'help']);
  assert.equal(result.complete, true);
});

test('a partial privacy answer receives only relevant missing parts', () => {
  const result = analyzeAnswer('У меня попросили фотографию школы.', SCENARIOS[1]);
  assert.deepEqual(result.found, ['signal']);
  assert.deepEqual(result.missing, ['action', 'help']);
});

test('neutral words do not satisfy safety action or help', () => {
  const result = analyzeAnswer('Подарок красивый и редкий.', SCENARIOS[0]);
  assert.deepEqual(result.found, ['signal']);
});

test('privacy answer recognizes closing chat and asking an adult', () => {
  const result = analyzeAnswer('Я закрыл чат и позвал маму.', SCENARIOS[1]);
  assert.deepEqual(result.found, ['action', 'help']);
});

test('bullying answer recognizes evidence and adult support', () => {
  const result = analyzeAnswer('Я сохранил сообщения и покажу взрослому.', SCENARIOS[2]);
  assert.deepEqual(result.found, ['action', 'help']);
});

test('content contains three fictional situations and no data request', () => {
  assert.equal(SCENARIOS.length, 3);
  const content = JSON.stringify(SCENARIOS).toLowerCase();
  assert.doesNotMatch(content, /https?:\/\//);
  assert.doesNotMatch(content, /введи (сво[её]|настоящее) (имя|адрес|телефон)/);
});
