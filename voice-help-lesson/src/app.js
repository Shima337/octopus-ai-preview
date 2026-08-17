import { analyzeAnswer } from './analyzer.js';
import { getServerMode, transcribeAudio } from './api.js';
import { SCENARIOS, SHIELD_PARTS } from './content.js';
import { createInitialState, transition } from './lesson-state.js';
import { createRecorder } from './recorder.js';

const app = document.querySelector('#app');
const testHooks = globalThis.__VOICE_LESSON_TEST__;
const recorderFactory = testHooks?.createRecorder ?? (() => createRecorder());
const transcribe = testHooks?.transcribeAudio ?? transcribeAudio;
let state = createInitialState();
let previousScreen = null;
let currentRecorder = null;
let recordingStatus = 'idle';
let recordingMessage = '';
let recordingSeconds = 0;
let recordingTimer = null;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function currentScenario() { return SCENARIOS[state.scenarioIndex]; }

function stepForScreen(screen) {
  if (screen === 'welcome') return 0;
  if (screen === 'privacy') return 1;
  if (screen === 'final') return 4;
  return Math.min(3, state.scenarioIndex + 2);
}

function shell(content) {
  const step = stepForScreen(state.screen);
  return `<main class="lesson-shell">
    <header class="topbar"><div class="brand"><span aria-hidden="true">◉</span><strong>Голос безопасности</strong></div><div class="mode-chip ${state.mode}"><i></i>${state.mode === 'openai' ? 'AI распознавание' : state.mode === 'demo' ? 'Демо-режим' : 'Проверяем связь'}</div></header>
    <nav class="progress" aria-label="Этапы занятия">${['Старт', 'Правило', 'Сцена 1', 'Сцена 2', 'Сцена 3'].map((label, index) => `<div class="${index < step ? 'done' : ''} ${index === step ? 'active' : ''}"><span>${index < step ? '✓' : index + 1}</span><em>${label}</em></div>`).join('')}</nav>
    ${content}
    <footer>Говори только о вымышленных ситуациях · Запись не сохраняется</footer>
  </main>`;
}

function renderWelcome() {
  return shell(`<section class="screen welcome" data-screen="welcome">
    <div class="hero-copy"><p class="eyebrow">Голосовая тренировка · 10–12 минут</p><h1 tabindex="-1">Твой голос —<br><span>часть щита</span></h1><p class="lead">Потренируйся спокойно рассказывать взрослому о странных сообщениях и просить о помощи.</p><div class="feature-row"><span>🎙️ 3 ответа</span><span>🛡️ 3 части щита</span><span>✨ Без оценок</span></div><button class="primary" type="button" data-action="START">Начать тренировку <span aria-hidden="true">→</span></button></div>
    <div class="voice-hero" aria-hidden="true"><div class="sound-ring ring-1"></div><div class="sound-ring ring-2"></div><div class="sound-ring ring-3"></div><div class="hero-mic">🎙️</div><span class="word word-a">СТОП</span><span class="word word-b">ПОМОГИ</span><span class="word word-c">Я НЕ НАЖАЛ</span></div>
  </section>`);
}

function renderPrivacy() {
  return shell(`<section class="screen privacy-screen" data-screen="privacy">
    <div class="privacy-art" aria-hidden="true"><span>🔒</span><i>🎙️</i></div><div class="privacy-copy"><p class="eyebrow">Перед микрофоном</p><h1 tabindex="-1">Три правила голоса</h1><div class="privacy-rules"><article><b>1</b><div><strong>Говорим о вымышленной сцене</strong><p>Не называй настоящее имя, школу, адрес, телефон, логин или пароль.</p></div></article><article><b>2</b><div><strong>Микрофон включаешь только ты</strong><p>Запись начинается после нажатия и остановится максимум через 20 секунд.</p></div></article><article><b>3</b><div><strong>Всегда можно напечатать</strong><p>Голос — тренировка, а не экзамен. Текстовый ответ работает так же.</p></div></article></div><button class="primary" type="button" data-action="ACCEPT_PRIVACY">Правила понятны <span aria-hidden="true">→</span></button></div>
  </section>`);
}

function shield(parts = state.currentParts) {
  return `<div class="mini-shield" aria-label="Три части сообщения взрослому">${SHIELD_PARTS.map((part) => `<div class="${parts.includes(part.id) ? 'complete' : ''}" data-shield-part="${part.id}"><span aria-hidden="true">${parts.includes(part.id) ? '✓' : part.icon}</span><strong>${escapeHtml(part.title)}</strong></div>`).join('')}</div>`;
}

function scenarioMessage(scenario) {
  return `<article class="message-card"><header><span aria-hidden="true">${scenario.icon}</span><div><strong>${escapeHtml(scenario.sender)}</strong><small>${escapeHtml(scenario.status)}</small></div><i aria-hidden="true">•••</i></header><p>${escapeHtml(scenario.message)}</p></article>`;
}

function recordingPanel() {
  if (recordingStatus === 'recording') return `<div class="recorder recording" data-recording-status="recording" role="status"><div class="recording-orb"><span>■</span><i></i><i></i></div><strong>Я слушаю… <b data-timer>${recordingSeconds} сек</b></strong><p>Расскажи сцену своими словами.</p><button class="stop-button" type="button" data-action="STOP_RECORDING">Закончить ответ</button></div>`;
  if (recordingStatus === 'requesting' || recordingStatus === 'processing') return `<div class="recorder processing" data-recording-status="${recordingStatus}" role="status"><div class="spinner" aria-hidden="true"></div><strong>${recordingStatus === 'requesting' ? 'Включаем микрофон…' : 'Превращаем голос в текст…'}</strong><p>Это займёт несколько секунд.</p></div>`;
  return `<div class="recorder ${recordingStatus === 'error' ? 'has-error' : ''}" data-recording-status="${recordingStatus}" aria-live="polite"><button class="mic-button" type="button" data-action="START_RECORDING" aria-label="Начать голосовой ответ"><span aria-hidden="true">🎙️</span></button><strong>Нажми и расскажи</strong><p>До 20 секунд. После записи текст можно исправить.</p>${recordingMessage ? `<div class="recording-error">${escapeHtml(recordingMessage)}</div>` : ''}<div class="recorder-actions"><button class="text-button" type="button" data-action="TEXT_MODE">⌨️ Ответить текстом</button>${recordingStatus === 'error' ? '<button class="sample-button" type="button" data-action="USE_SAMPLE_TRANSCRIPT">✨ Взять безопасный пример</button>' : ''}</div></div>`;
}

function renderScenario() {
  const scenario = currentScenario();
  return shell(`<section class="screen scenario-screen" data-screen="scenario" data-scenario-id="${scenario.id}"><div class="scene-head"><div><p class="eyebrow">Ситуация ${state.scenarioIndex + 1} из ${SCENARIOS.length}</p><h1 tabindex="-1">${escapeHtml(scenario.title)}</h1></div><span>${scenario.icon}</span></div>${shield()}<div class="scenario-grid">${scenarioMessage(scenario)}<div class="voice-task"><h2>Расскажи взрослому</h2><p>${escapeHtml(scenario.prompt)}</p>${recordingPanel()}</div></div></section>`);
}

function renderTranscript() {
  const scenario = currentScenario();
  return shell(`<section class="screen transcript-screen" data-screen="transcript"><div class="section-head"><p class="eyebrow">Ситуация ${state.scenarioIndex + 1} · Проверка текста</p><h1 tabindex="-1">Так ли тебя услышали?</h1><p>Исправь слово, если микрофон распознал его неточно. Здесь нет оценки за произношение.</p></div><div class="transcript-grid"><div>${scenarioMessage(scenario)}</div><div class="transcript-editor"><label for="transcript">Твой ответ</label><textarea id="transcript" data-transcript rows="7" placeholder="Напиши, что произошло, что ты сделал и какая помощь нужна.">${escapeHtml(state.transcript)}</textarea><small>Не добавляй настоящее имя, адрес, школу, телефон или пароль.</small><button class="primary wide" type="button" data-action="CHECK_ANSWER">Собрать голосовой щит <span aria-hidden="true">→</span></button></div></div></section>`);
}

function renderFeedback() {
  const complete = state.canContinue;
  const missing = SHIELD_PARTS.filter((part) => state.missingParts.includes(part.id));
  return shell(`<section class="screen feedback-screen" data-screen="feedback"><div class="feedback-hero ${complete ? 'success' : 'partial'}"><span aria-hidden="true">${complete ? '✨' : '💡'}</span><p class="eyebrow">${complete ? 'Фраза помощи собрана' : 'Уже есть хорошее начало'}</p><h1 tabindex="-1">${complete ? 'Твой голос стал щитом!' : `Собрано ${state.currentParts.length} из 3 частей`}</h1><p>${complete ? 'Ты назвал опасность, рассказал о безопасном действии и попросил взрослого помочь.' : 'Сохраняем всё, что уже получилось. Осталось добавить недостающие части.'}</p></div>${shield()}${missing.length ? `<div class="missing-prompts"><h2>Что можно добавить</h2>${missing.map((part) => `<article><span>${part.icon}</span><div><strong>${escapeHtml(part.title)}</strong><p>${escapeHtml(part.prompt)}</p></div></article>`).join('')}</div>` : ''}<div class="feedback-actions">${complete ? '<button class="primary" type="button" data-action="CONTINUE">Следующая ситуация <span aria-hidden="true">→</span></button>' : '<button class="primary" type="button" data-action="RETRY">Дополнить ответ <span aria-hidden="true">→</span></button>'}${state.exampleAvailable && !complete ? '<button class="secondary" type="button" data-action="USE_EXAMPLE">Посмотреть безопасный пример</button>' : ''}</div></section>`);
}

function renderFinal() {
  return shell(`<section class="screen final-screen" data-screen="final"><div class="final-badge"><div aria-hidden="true">🎙️</div><p class="eyebrow">Три тренировки пройдены</p><h1 tabindex="-1">Голос цифровой безопасности</h1><p>Теперь ты знаешь, как спокойно рассказать взрослому о странной ситуации.</p></div><div class="universal-phrase"><span aria-hidden="true">“</span><div><small>Универсальная фраза</small><strong>Мне пришло странное сообщение. Я ничего не нажал и не отправил. Пожалуйста, помоги мне проверить.</strong></div></div><div class="completed-scenes">${SCENARIOS.map((scenario) => `<article data-completed-scenario><span>${scenario.icon}</span><div><strong>${escapeHtml(scenario.title)}</strong><p>Что случилось · Что я сделал · Помоги мне</p></div><i>✓</i></article>`).join('')}</div><button class="secondary restart" type="button" data-action="RESTART">Пройти ещё раз</button></section>`);
}

function render() {
  const renderers = { welcome: renderWelcome, privacy: renderPrivacy, scenario: renderScenario, transcript: renderTranscript, feedback: renderFeedback, final: renderFinal };
  app.innerHTML = (renderers[state.screen] ?? renderWelcome)();
  if (previousScreen !== state.screen) {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => app.querySelector('h1[tabindex="-1"]')?.focus({ preventScroll: true }));
  }
  previousScreen = state.screen;
}

function stopTimer() {
  if (recordingTimer) window.clearInterval(recordingTimer);
  recordingTimer = null;
}

async function startRecording() {
  recordingStatus = 'requesting'; recordingMessage = ''; render();
  try {
    currentRecorder = recorderFactory();
    await currentRecorder.start();
    recordingStatus = 'recording'; recordingSeconds = 0; render();
    const startTime = Date.now();
    recordingTimer = window.setInterval(() => {
      recordingSeconds = Math.min(20, Math.floor((Date.now() - startTime) / 1000));
      const timer = app.querySelector('[data-timer]');
      if (timer) timer.textContent = `${recordingSeconds} сек`;
    }, 250);
  } catch {
    recordingStatus = 'error';
    recordingMessage = 'Микрофон сейчас недоступен. Можно напечатать ответ или попробовать ещё раз.';
    render();
  }
}

async function stopRecording() {
  stopTimer(); recordingStatus = 'processing'; render();
  try {
    const result = await currentRecorder.stop();
    const transcript = await transcribe(result.blob);
    state = transition(state, { type: 'SET_TRANSCRIPT', transcript: transcript.text });
    recordingStatus = 'idle'; render();
  } catch (error) {
    recordingStatus = 'error';
    recordingMessage = error?.code === 'TRANSCRIPTION_UNAVAILABLE'
      ? 'Сервер работает без API-ключа. Для проверки выбери безопасный пример или напечатай ответ.'
      : 'Не получилось превратить запись в текст. Запись не сохранена — можно попробовать снова или напечатать.';
    render();
  }
}

app.addEventListener('click', async (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action === 'START_RECORDING') { await startRecording(); return; }
  if (action === 'STOP_RECORDING') { await stopRecording(); return; }
  if (action === 'TEXT_MODE') { state = transition(state, { type: 'SET_TRANSCRIPT', transcript: state.transcript }); render(); return; }
  if (action === 'USE_SAMPLE_TRANSCRIPT') { state = transition(state, { type: 'SET_TRANSCRIPT', transcript: currentScenario().example }); recordingStatus = 'idle'; render(); return; }
  if (action === 'CHECK_ANSWER') {
    const transcript = app.querySelector('[data-transcript]')?.value ?? state.transcript;
    state = transition(state, { type: 'SET_TRANSCRIPT', transcript });
    state = transition(state, { type: 'CHECK_ANSWER', analysis: analyzeAnswer(transcript, currentScenario()) });
    render(); return;
  }
  if (action === 'USE_EXAMPLE') { state = transition(state, { type: 'USE_EXAMPLE', transcript: currentScenario().example }); render(); return; }
  if (action === 'ACCEPT_PRIVACY') state = transition(state, { type: action, mode: state.mode });
  else state = transition(state, { type: action });
  recordingStatus = 'idle'; recordingMessage = ''; stopTimer(); render();
});

render();
getServerMode().then((mode) => { state = transition(state, { type: 'SET_MODE', mode }); render(); });
