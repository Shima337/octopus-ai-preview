# Voice Help Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate 10–12 minute Russian voice lesson in which children rehearse asking a trusted adult for help in three digital-safety situations, with server-side OpenAI transcription and complete no-key/text fallbacks.

**Architecture:** A dependency-light Node.js server serves the static client and exposes health/transcription endpoints. The browser records one short audio blob through `MediaRecorder`, sends it to the server, lets the learner edit the transcript, and passes only text to a deterministic local analyzer and state machine. OpenAI credentials stay server-side; the server keeps audio only in memory and supports a demo mode when no key is configured.

**Tech Stack:** Node.js 20+, native `fetch`, `FormData`, `Blob`, `node:http`, browser `MediaRecorder`, vanilla ES modules, CSS, Node test runner, Playwright for end-to-end testing.

## Global Constraints

- Create a new `voice-help-lesson/` application; do not modify either existing lesson.
- The three situations are prize/password, stranger/personal data, and repeated bullying.
- A recording is explicitly started and stopped, automatically stops at 20 seconds, and is never required to finish the lesson.
- Do not request real name, address, school, phone number, login, password, account name, or contact details.
- Do not persist audio; do not log audio, transcripts, child identifiers, or the API key.
- `OPENAI_API_KEY` is read only by the server and `.env` is excluded from Git.
- `OPENAI_TRANSCRIBE_MODEL` defaults to `gpt-transcribe`.
- Transcript text is editable before deterministic local analysis.
- Error language is supportive and never calls pronunciation or an answer bad, wrong, or a failure.
- All functions are keyboard accessible, expose textual status, and work when reduced motion is requested.

---

## File Structure

- `voice-help-lesson/package.json` — launch and test commands.
- `voice-help-lesson/index.html` — accessible application shell and privacy metadata.
- `voice-help-lesson/server/serve.mjs` — static server and `/api/health`, `/api/transcribe` routing.
- `voice-help-lesson/server/transcription.mjs` — validation, OpenAI request, public error mapping.
- `voice-help-lesson/src/content.js` — three scenarios, prompts, example transcripts, analyzer vocabularies.
- `voice-help-lesson/src/analyzer.js` — text normalization and three-part semantic matching.
- `voice-help-lesson/src/lesson-state.js` — pure lesson state and transitions.
- `voice-help-lesson/src/recorder.js` — `MediaRecorder` adapter and 20-second cutoff.
- `voice-help-lesson/src/api.js` — health and transcription client.
- `voice-help-lesson/src/app.js` — rendering, event handling, accessibility focus, recorder orchestration.
- `voice-help-lesson/src/styles.css` — responsive visual system and recording states.
- `voice-help-lesson/tests/analyzer.test.mjs` — semantic matching tests.
- `voice-help-lesson/tests/state.test.mjs` — state machine tests.
- `voice-help-lesson/tests/server.test.mjs` — injected fetch and endpoint tests without real API spending.
- `voice-help-lesson/tests/adapters.test.mjs` — recorder/API adapter tests.
- `voice-help-lesson/tests/e2e.mjs` — complete mocked voice and text paths.
- `voice-help-lesson/.env.example` — variable names only.
- `voice-help-lesson/README.md` — safe setup, launch, testing, and real-microphone checklist.

---

### Task 1: Content and deterministic answer analyzer

**Files:**
- Create: `voice-help-lesson/package.json`
- Create: `voice-help-lesson/src/content.js`
- Create: `voice-help-lesson/src/analyzer.js`
- Test: `voice-help-lesson/tests/analyzer.test.mjs`

**Interfaces:**
- Produces: `SCENARIOS: Scenario[]`, `getScenario(id): Scenario | null`.
- Produces: `normalizeText(text): string` and `analyzeAnswer(text, scenario): { found: string[], missing: string[], complete: boolean }`.
- A `Scenario` contains `id`, `title`, `sender`, `message`, `prompt`, `example`, and `signals`, `actions`, `help` arrays of safe matching phrases.

- [ ] **Step 1: Write failing analyzer and content tests**

```js
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

test('a partial answer receives only relevant missing parts', () => {
  const result = analyzeAnswer('У меня попросили фотографию школы.', SCENARIOS[1]);
  assert.deepEqual(result.found, ['signal']);
  assert.deepEqual(result.missing, ['action', 'help']);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/analyzer.test.mjs`

Expected: FAIL because `content.js` and `analyzer.js` do not exist.

- [ ] **Step 3: Implement scenario data and phrase matching**

```js
export function normalizeText(text) {
  return String(text).toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/[^а-яa-z0-9\s-]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(normalizeText(phrase)));
}

export function analyzeAnswer(text, scenario) {
  const normalized = normalizeText(text);
  const checks = {
    signal: includesAny(normalized, scenario.signals),
    action: includesAny(normalized, scenario.actions),
    help: includesAny(normalized, scenario.help),
  };
  const found = Object.keys(checks).filter((key) => checks[key]);
  const missing = Object.keys(checks).filter((key) => !checks[key]);
  return { found, missing, complete: missing.length === 0 };
}
```

- [ ] **Step 4: Add negative tests for neutral words and all three scenarios**

Add assertions that `подарок красивый` does not satisfy the action/help groups, `я закрыл чат и позвал маму` satisfies action/help for privacy, and `сохранил сообщения и покажу взрослому` satisfies action/help for bullying.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/analyzer.test.mjs`

Expected: all analyzer tests pass with zero failures.

- [ ] **Step 6: Commit the domain layer**

```bash
git add voice-help-lesson/package.json voice-help-lesson/src/content.js voice-help-lesson/src/analyzer.js voice-help-lesson/tests/analyzer.test.mjs
git commit -m "feat: add voice lesson answer analyzer"
```

---

### Task 2: Pure lesson state machine

**Files:**
- Create: `voice-help-lesson/src/lesson-state.js`
- Test: `voice-help-lesson/tests/state.test.mjs`

**Interfaces:**
- Produces: `createInitialState(): LessonState`.
- Produces: `transition(state, event): LessonState`.
- Screens: `welcome`, `privacy`, `scenario`, `transcript`, `feedback`, `final`.
- Events: `START`, `ACCEPT_PRIVACY`, `SET_TRANSCRIPT`, `CHECK_ANSWER`, `RETRY`, `USE_EXAMPLE`, `CONTINUE`, `RESTART`.

- [ ] **Step 1: Write failing transition tests**

```js
test('privacy gate precedes the first scenario', () => {
  let state = createInitialState();
  state = transition(state, { type: 'START' });
  assert.equal(state.screen, 'privacy');
  state = transition(state, { type: 'ACCEPT_PRIVACY' });
  assert.equal(state.screen, 'scenario');
  assert.equal(state.scenarioIndex, 0);
});

test('partial answer can be retried without losing found shield parts', () => {
  const checked = transition(baseScenarioState, {
    type: 'CHECK_ANSWER',
    analysis: { found: ['signal'], missing: ['action', 'help'], complete: false },
  });
  assert.deepEqual(checked.currentParts, ['signal']);
  assert.equal(transition(checked, { type: 'RETRY' }).screen, 'scenario');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/state.test.mjs`

Expected: FAIL because `lesson-state.js` does not exist.

- [ ] **Step 3: Implement immutable transitions and completion rules**

The initial state is:

```js
{
  version: 1,
  screen: 'welcome',
  scenarioIndex: 0,
  transcript: '',
  attempts: 0,
  currentParts: [],
  completedScenarios: [],
  mode: 'unknown',
}
```

`CONTINUE` advances only after `complete === true` or after `USE_EXAMPLE`; advancing clears the transcript and current parts. Completing scenario three switches to `final`.

- [ ] **Step 4: Add tests for edited transcript, example escape hatch, all three scenarios, and restart**

Assert that transcript edits replace the prior value, an example permits progress after two partial attempts, final contains all three scenario ids, and restart exactly equals `createInitialState()`.

- [ ] **Step 5: Run state and analyzer tests**

Run: `node --test tests/analyzer.test.mjs tests/state.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit the state machine**

```bash
git add voice-help-lesson/src/lesson-state.js voice-help-lesson/tests/state.test.mjs
git commit -m "feat: add voice lesson state machine"
```

---

### Task 3: Safe transcription server and demo mode

**Files:**
- Create: `voice-help-lesson/server/transcription.mjs`
- Create: `voice-help-lesson/server/serve.mjs`
- Create: `voice-help-lesson/.env.example`
- Modify: `.gitignore`
- Test: `voice-help-lesson/tests/server.test.mjs`

**Interfaces:**
- Produces: `validateAudio(file): { ok: true } | { ok: false, code: string }`.
- Produces: `createTranscriber({ apiKey, model, fetchImpl }): (file) => Promise<string>`.
- Produces: `createAppServer({ rootDir, transcribe }): http.Server` for injected testing.
- Routes: `GET /api/health`, `POST /api/transcribe`, static `GET`/`HEAD`.

- [ ] **Step 1: Write failing validation and health tests**

```js
test('health reveals mode but never credential material', async () => {
  const server = createAppServer({ rootDir, transcribe: null });
  const response = await request(server, '/api/health');
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), { ok: true, transcription: 'demo' });
  assert.doesNotMatch(body, /sk-/);
});

test('audio validation rejects unsupported and oversized files', () => {
  assert.deepEqual(validateAudio(new File(['x'], 'x.txt', { type: 'text/plain' })), { ok: false, code: 'UNSUPPORTED_AUDIO' });
  assert.equal(validateAudio(fakeFileAboveLimit).code, 'TOO_LARGE');
});
```

- [ ] **Step 2: Run the focused server test and verify RED**

Run: `node --test tests/server.test.mjs`

Expected: FAIL because the server modules do not exist.

- [ ] **Step 3: Implement validation and OpenAI adapter**

Use a 4 MB application limit, accept `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`, `audio/wav`, and build an upstream `FormData` request:

```js
const body = new FormData();
body.set('file', file, file.name || 'answer.webm');
body.set('model', model || 'gpt-transcribe');
body.set('language', 'ru');
body.set('prompt', 'Детский урок цифровой безопасности: пароль, подарок, незнакомец, фотография, расписание, чат, травля, взрослый, помощь.');

const response = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body,
});
```

Return only `payload.text`. Convert upstream failures to `TRANSCRIPTION_FAILED` without exposing response bodies.

- [ ] **Step 4: Implement server routes and in-memory multipart parsing**

Convert the incoming request to a Web `Request`, call `formData()`, validate the `audio` file, and do not write it to disk. In demo mode, return status `503` with `{ ok: false, code: 'TRANSCRIPTION_UNAVAILABLE', mode: 'demo' }`. Static routing must prevent `..` path traversal and serve only files inside `rootDir`.

At process startup, `serve.mjs` reads a local `.env` file if it exists, accepts only `OPENAI_API_KEY`, `OPENAI_TRANSCRIBE_MODEL`, and `PORT`, and never logs their values. Existing process environment values take precedence over the file.

- [ ] **Step 5: Add injected upstream and endpoint tests**

Cover successful Russian text, upstream 401/500 redaction, no-key mode, missing file, unsupported type, oversized `Content-Length`, traversal rejection, and a static `index.html` response. The fake fetch must assert that authorization is present upstream while health/client responses contain no key.

- [ ] **Step 6: Run all server tests and verify GREEN**

Run: `node --test tests/server.test.mjs`

Expected: all server tests pass and make no real network requests.

- [ ] **Step 7: Add safe environment files and commit**

`.env.example` contains only:

```dotenv
OPENAI_API_KEY=
OPENAI_TRANSCRIBE_MODEL=gpt-transcribe
PORT=4175
```

Add `voice-help-lesson/.env` to the repository `.gitignore`.

```bash
git add .gitignore voice-help-lesson/server voice-help-lesson/tests/server.test.mjs voice-help-lesson/.env.example
git commit -m "feat: add safe voice transcription server"
```

---

### Task 4: Recorder and API client adapters

**Files:**
- Create: `voice-help-lesson/src/recorder.js`
- Create: `voice-help-lesson/src/api.js`
- Test: `voice-help-lesson/tests/adapters.test.mjs`

**Interfaces:**
- Produces: `createRecorder({ mediaDevices, MediaRecorderClass, timeoutMs, clock }): VoiceRecorder`.
- `VoiceRecorder.start()` requests audio only; `stop()` resolves `{ blob, durationMs }`; `cancel()` discards chunks and stops tracks.
- Produces: `getServerMode(fetchImpl): Promise<'openai' | 'demo'>`.
- Produces: `transcribeAudio(blob, fetchImpl): Promise<{ text: string }>` with public error codes.

- [ ] **Step 1: Write failing adapter tests with fake media primitives**

```js
test('recorder requests audio only and stops every track', async () => {
  const recorder = createRecorder({ mediaDevices, MediaRecorderClass: FakeMediaRecorder, timeoutMs: 20_000, clock });
  await recorder.start();
  const result = await recorder.stop();
  assert.deepEqual(mediaDevices.lastConstraints, { audio: true, video: false });
  assert.equal(fakeTrack.stopped, true);
  assert.equal(result.blob.type, 'audio/webm');
});

test('API client sends only multipart audio and maps demo mode', async () => {
  const result = await transcribeAudio(new Blob(['voice'], { type: 'audio/webm' }), fakeFetch);
  assert.equal(result.text, 'Я ничего не нажал и позвал взрослого');
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/adapters.test.mjs`

Expected: FAIL because adapter modules do not exist.

- [ ] **Step 3: Implement recorder lifecycle and timeout**

Select the first supported type from `audio/webm;codecs=opus`, `audio/webm`, `audio/ogg;codecs=opus`. Ensure `stop()` is idempotent, tracks stop after success/error/cancel, and no Blob or transcript is persisted.

- [ ] **Step 4: Implement API client and public error mapping**

Send `FormData` with one field named `audio`; do not add a manual `Content-Type` header. Convert abort/network/server errors to `VoiceApiError` codes consumed by the UI.

- [ ] **Step 5: Add timeout, permission denial, empty recording, and server error tests**

Use fake clocks and fake fetch; assert no test contacts the network.

- [ ] **Step 6: Run adapter tests and commit**

```bash
node --test tests/adapters.test.mjs
git add voice-help-lesson/src/recorder.js voice-help-lesson/src/api.js voice-help-lesson/tests/adapters.test.mjs
git commit -m "feat: add voice recording adapters"
```

---

### Task 5: Complete responsive lesson interface

**Files:**
- Create: `voice-help-lesson/index.html`
- Create: `voice-help-lesson/src/app.js`
- Create: `voice-help-lesson/src/styles.css`
- Test: `voice-help-lesson/tests/e2e.mjs`

**Interfaces:**
- Consumes: `SCENARIOS`, `analyzeAnswer`, state transitions, recorder, and API client.
- Produces: a complete browser lesson at `http://127.0.0.1:4175/`.
- Test-only browser seams: `globalThis.__VOICE_LESSON_TEST__?.createRecorder` and `globalThis.__VOICE_LESSON_TEST__?.transcribeAudio`; production never defines them.

- [ ] **Step 1: Write a failing end-to-end test for the complete mocked voice path**

The test installs recorder/transcription fakes before the page script, then verifies:

```js
await page.locator('[data-action="START"]').click();
await page.locator('[data-action="ACCEPT_PRIVACY"]').click();
await page.locator('[data-action="START_RECORDING"]').click();
await page.locator('[data-action="STOP_RECORDING"]').click();
await page.locator('[data-action="CHECK_ANSWER"]').click();
assert.equal(await page.locator('[data-shield-part].complete').count(), 3);
```

Continue through all three scenarios and assert the final badge, zero console errors, one visible `h1`, no unnamed visible buttons, and no horizontal overflow at 390×844 and 1280×800.

- [ ] **Step 2: Run E2E and verify RED**

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: FAIL because the interface does not exist.

- [ ] **Step 3: Build welcome, privacy, and scenario recording screens**

The scenario screen contains the fictional message, three-part shield, microphone button, visible timer/status, and an always-visible «Ответить текстом» action. No personal-data fields exist.

- [ ] **Step 4: Build transcript review and supportive feedback screens**

Render the transcript in a labelled `<textarea>`. On check, show found parts and one concrete prompt per missing part. After two attempts, reveal «Посмотреть пример» without blocking another recording.

- [ ] **Step 5: Build final badge and restart flow**

Show the universal help phrase, all three completed scenes, a «Повторить ситуацию» choice, and a confirmed full restart. Move programmatic focus to the screen heading and dialog heading after every transition.

- [ ] **Step 6: Implement responsive visual design and reduced motion**

Use a distinct voice/radio visual identity with animated sound rings only while recording, large touch controls, status text, high contrast, and single-column layouts below 700 px. `@media (prefers-reduced-motion: reduce)` removes sound-ring and transition animation.

- [ ] **Step 7: Add text fallback and recovery E2E paths**

Test microphone denial → text input, demo server → safe sample transcript, partial answer → edit/retry, API failure → retry/text/sample choices, keyboard activation, and final restart.

- [ ] **Step 8: Run unit and E2E suites and commit**

```bash
node --test tests/*.test.mjs
NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs
git add voice-help-lesson/index.html voice-help-lesson/src/app.js voice-help-lesson/src/styles.css voice-help-lesson/tests/e2e.mjs
git commit -m "feat: build voice help lesson experience"
```

---

### Task 6: Documentation, security inspection, and real-browser QA

**Files:**
- Create: `voice-help-lesson/README.md`
- Modify: `voice-help-lesson/package.json`
- Test: all existing `voice-help-lesson/tests/*`

**Interfaces:**
- Produces: `npm start`, `npm test`, `npm run test:e2e` commands and safe operator instructions.

- [ ] **Step 1: Add run and test scripts**

```json
{
  "scripts": {
    "start": "node server/serve.mjs",
    "test": "node --test tests/*.test.mjs",
    "test:e2e": "node tests/e2e.mjs"
  }
}
```

- [ ] **Step 2: Write setup and safety documentation**

Document copying `.env.example` to `.env`, setting `OPENAI_API_KEY` locally, never pasting a key into browser code, the demo-mode behavior, supported audio formats, 20-second cutoff, no-storage design, Zero Data Retention prerequisite for under-13 personal data, adult-only showcase guidance before compliance review, and the exact real-microphone checklist.

- [ ] **Step 3: Add automated secret and forbidden-content checks**

Run repository searches that fail if `sk-` credentials, child personal-data prompts, external links in client content, or transcript logging occur. Keep only official documentation links in `README.md`, never in the child-facing application.

- [ ] **Step 4: Run syntax and complete automated verification**

```bash
for file in src/*.js server/*.mjs tests/*.mjs; do node --check "$file"; done
npm test
NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules npm run test:e2e
git diff --check
```

Expected: all commands exit 0, all unit/server tests report zero failures, and E2E finishes without output or errors.

- [ ] **Step 5: Perform real-browser visual QA**

At 1280×800 and 390×844 inspect welcome, privacy, recording, transcript, partial feedback, final, permission-denied fallback, and demo mode. Confirm recording status is readable without animation, buttons remain at least 48 px, the page does not scroll horizontally, and no API credential appears in DOM or network responses.

- [ ] **Step 6: Commit the finished lesson**

```bash
git add voice-help-lesson .gitignore
git commit -m "feat: finish voice safety lesson"
```
