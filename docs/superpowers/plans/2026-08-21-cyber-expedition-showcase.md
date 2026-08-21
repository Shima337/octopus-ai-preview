# Cyber Expedition Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone 25–35 minute Russian-language cybersecurity showcase for children aged 7–10 with four game chapters, reviewer quick navigation, replaceable media, one safe Realtime voice role-play, and a printable safety card.

**Architecture:** Create an independent `cyber-expedition-demo/` vanilla web application served by a small Node.js backend on port `4177`. Pure state transitions and chapter rules remain separately testable; browser rendering consumes those models, while the server alone owns the OpenAI API key and proxies Realtime SDP and structured evaluation.

**Tech Stack:** Node.js 20+, ES modules, semantic HTML, CSS, browser JavaScript, Node test runner, Playwright, OpenAI Realtime WebRTC and Responses API.

**Spec:** `docs/superpowers/specs/2026-08-21-cyber-expedition-showcase-design.md`

**Media scripts:** `docs/superpowers/specs/2026-08-21-cyber-expedition-media-scripts.md`

## Global Constraints

- Create only `cyber-expedition-demo/` plus the root `.gitignore` entries required for its `.env` and `node_modules`; do not modify `digital-map-lesson/` or `voice-help-lesson/`.
- Default local URL is `http://127.0.0.1:4177/`.
- The complete child route lasts approximately 25–35 minutes; reviewer mode can open every chapter, voice task, and final card directly.
- Do not request or store a real name, address, school, phone, login, password, schedule, email, working URL, or QR code.
- All accounts, messages, photos, links, codes, and characters are fictional.
- Every chapter works without video files; voice always has a deterministic text fallback.
- The OpenAI API key remains server-side in `.env` and is never returned by an endpoint or embedded in client code.
- Realtime is used only for the fourth chapter's bounded voice role-play and closes after 90 seconds or whenever the user leaves that screen.
- Media never autoplay with sound; every video supports Russian captions and a skip path.
- Support keyboard use, reduced motion, 390 px mobile width, and 1280 px desktop width without horizontal page scrolling.
- Use test-first development and commit after each independently working task.

---

## File Map

### Project and server

- `cyber-expedition-demo/package.json` — scripts and Playwright development dependency.
- `cyber-expedition-demo/index.html` — document shell and application mount point.
- `cyber-expedition-demo/.env.example` — server-only OpenAI and port configuration.
- `cyber-expedition-demo/README.md` — local run, media integration, voice setup, and privacy notes.
- `cyber-expedition-demo/server/serve.mjs` — static serving, `.env` loading, API validation, rate limits, and HTTP routes.
- `cyber-expedition-demo/server/openai.mjs` — OpenAI Realtime call creation and structured voice evaluation.

### Application core

- `cyber-expedition-demo/src/app.js` — event delegation, state persistence, renderer routing, voice-resource cleanup, and startup.
- `cyber-expedition-demo/src/content.js` — districts, shield parts, media records, final-card choices, and safe copy.
- `cyber-expedition-demo/src/lesson-state.js` — versioned initial state, sequential transitions, chapter completion, and preview-state construction.
- `cyber-expedition-demo/src/storage.js` — local persistence, validation, migration, and reset.
- `cyber-expedition-demo/src/media.js` — video/poster/caption/audio model selection and fallback behavior.
- `cyber-expedition-demo/src/ui.js` — shared shell, start, city map, media slot, reward, and generic result renderers.
- `cyber-expedition-demo/src/styles.css` — responsive visual system, chapter themes, print styles, focus states, and reduced motion.

### Chapter modules

- `cyber-expedition-demo/src/chapters/mirror.js` — safe-post hotspots, caption choice, feedback, and chapter renderer.
- `cyber-expedition-demo/src/chapters/locks.js` — password classification, training phrase builder, 2FA sequence, and renderer.
- `cyber-expedition-demo/src/chapters/traps.js` — three clue cases, safe action branching, hints, and renderer.
- `cyber-expedition-demo/src/chapters/chat.js` — deterministic stranger/bullying chat graph, scoring, and renderer.
- `cyber-expedition-demo/src/voice-scenario.js` — bounded demo turns, privacy detector, and local evaluation.
- `cyber-expedition-demo/src/realtime-client.js` — microphone and WebRTC lifecycle.
- `cyber-expedition-demo/src/voice-api.js` — safe client calls to health, session, and evaluation endpoints.
- `cyber-expedition-demo/src/final-card.js` — card validation, rendering model, Canvas export, and print action.

### Media and tests

- `cyber-expedition-demo/media/README.md` — exact filenames and formats from the media scripts.
- `cyber-expedition-demo/tests/content.test.mjs` — content completeness and privacy assertions.
- `cyber-expedition-demo/tests/state.test.mjs` — route and reviewer preview state.
- `cyber-expedition-demo/tests/chapters.test.mjs` — all deterministic game rules.
- `cyber-expedition-demo/tests/adapters.test.mjs` — storage, media, voice API, and Realtime adapters.
- `cyber-expedition-demo/tests/server.test.mjs` — server validation and OpenAI boundaries.
- `cyber-expedition-demo/tests/final-card.test.mjs` — safe final-card model.
- `cyber-expedition-demo/tests/e2e.mjs` — full child route, quick navigation, responsive layout, keyboard access, and downloads.

---

### Task 1: Independent Project Shell and Static Server

**Files:**
- Create: `cyber-expedition-demo/package.json`
- Create: `cyber-expedition-demo/index.html`
- Create: `cyber-expedition-demo/server/serve.mjs`
- Create: `cyber-expedition-demo/tests/server.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `createLessonServer({ rootDir, env, fetchImpl }): http.Server`
- Produces: `GET /api/health -> { ok: true, realtime: "demo" | "openai" }`
- Produces: static `GET /` and `HEAD` responses rooted at `cyber-expedition-demo/`
- Private helpers: `sendJson(response, status, body)`, `resolveStaticPath(rootDir, requestUrl)`, `serveStatic(filePath, method, response)`

- [ ] **Step 1: Add the package and test command**

```json
{
  "name": "cyber-expedition-demo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server/serve.mjs",
    "test": "node --test tests/*.test.mjs",
    "test:e2e": "node tests/e2e.mjs"
  },
  "devDependencies": { "playwright": "^1.62.1" }
}
```

- [ ] **Step 2: Write the failing static-server tests**

```js
async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('standalone server serves the shell and reports demo mode', async () => {
  const server = createLessonServer({ rootDir: process.cwd(), env: {} });
  const running = await listen(server);
  try {
    const page = await fetch(`${running.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Киберэкспедиция/);
    assert.deepEqual(await (await fetch(`${running.baseUrl}/api/health`)).json(), {
      ok: true, realtime: 'demo',
    });
    const traversal = await fetch(`${running.baseUrl}/..%2F..%2Fetc%2Fpasswd`);
    assert.equal(traversal.status, 404);
  } finally {
    await running.close();
  }
});
```

- [ ] **Step 3: Run the test and verify RED**

Run: `cd cyber-expedition-demo && npm test`

Expected: FAIL because `server/serve.mjs` does not exist.

- [ ] **Step 4: Implement the minimal server and document shell**

```js
export function createLessonServer({ rootDir, env = {} } = {}) {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://local').pathname;
    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(response, 200, { ok: true, realtime: env.OPENAI_API_KEY ? 'openai' : 'demo' });
    }
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
    const filePath = resolveStaticPath(rootDir, request.url);
    if (!filePath) return response.writeHead(404).end();
    return serveStatic(filePath, request.method, response);
  });
}
```

`resolveStaticPath` must decode once, normalize the pathname, reject malformed escapes, NUL bytes, and any resolved path outside `rootDir`, map `/` to `index.html`, and return `null` for non-files. `serveStatic` uses a fixed extension-to-MIME map, writes `Content-Length`, and omits the body for `HEAD`. `sendJson` serializes once and writes UTF-8 JSON with its byte length.

Create `index.html` with `<main id="app"></main>`, a module script for `/src/app.js`, viewport metadata, Russian language, and a `<noscript>` explanation.

- [ ] **Step 5: Protect local secrets and dependencies**

```gitignore
cyber-expedition-demo/.env
cyber-expedition-demo/node_modules/
```

- [ ] **Step 6: Install dependencies and verify GREEN**

Run: `cd cyber-expedition-demo && npm install && npm test`

Expected: all server tests PASS and `package-lock.json` is created.

- [ ] **Step 7: Commit**

```bash
git add .gitignore cyber-expedition-demo/package.json cyber-expedition-demo/package-lock.json cyber-expedition-demo/index.html cyber-expedition-demo/server/serve.mjs cyber-expedition-demo/tests/server.test.mjs
git commit -m "feat: scaffold cyber expedition demo"
```

### Task 2: Safe Content and Replaceable Media Contract

**Files:**
- Create: `cyber-expedition-demo/src/content.js`
- Create: `cyber-expedition-demo/src/media.js`
- Create: `cyber-expedition-demo/media/README.md`
- Create: `cyber-expedition-demo/tests/content.test.mjs`
- Create: `cyber-expedition-demo/tests/adapters.test.mjs`

**Interfaces:**
- Produces: `DISTRICTS`, `SHIELD_PARTS`, `VIDEOS`, `SAFETY_RULES`, `TRUSTED_ADULT_ROLES`, `HABITS`
- Produces: `getDistrict(id)`, `getVideo(id)`, `getShieldPart(id)` returning records or `null`
- Produces: `getMediaModel(video): { mode: "video" | "audio" | "placeholder", source, poster, captions, audio }`

- [ ] **Step 1: Write failing content-safety and media-fallback tests**

```js
test('showcase defines four districts, four shield parts, and five media slots', () => {
  assert.equal(DISTRICTS.length, 4);
  assert.deepEqual(DISTRICTS.map((item) => item.id), ['mirror', 'locks', 'traps', 'messages']);
  assert.equal(SHIELD_PARTS.length, 4);
  assert.equal(VIDEOS.length, 5);
});

test('content contains no working URLs or prompts for real personal data', () => {
  const text = JSON.stringify({ DISTRICTS, VIDEOS, SAFETY_RULES, TRUSTED_ADULT_ROLES, HABITS });
  assert.doesNotMatch(text, /https?:\/\//i);
  assert.doesNotMatch(text, /введи(?:те)? (?:свой|настоящ)/i);
});

test('media uses a placeholder until a local source is configured', () => {
  assert.deepEqual(getMediaModel({ id: 'intro', source: null, audio: null }), {
    mode: 'placeholder', source: null, poster: null, captions: null, audio: null,
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && npm test`

Expected: FAIL because `src/content.js` and `src/media.js` do not exist.

- [ ] **Step 3: Implement exact content records**

```js
export const DISTRICTS = [
  { id: 'mirror', title: 'Зеркальный сад', icon: '🪞', partId: 'privacy', theme: 'aqua' },
  { id: 'locks', title: 'Замок секретов', icon: '🔐', partId: 'secret', theme: 'gold' },
  { id: 'traps', title: 'Ярмарка ловушек', icon: '🔎', partId: 'check', theme: 'violet' },
  { id: 'messages', title: 'Станция общения', icon: '💬', partId: 'help', theme: 'coral' },
];

export const VIDEOS = [
  { id: 'city-intro', source: null, poster: null, captions: null, audio: null },
  { id: 'mirror-post', source: null, poster: null, captions: null, audio: null },
  { id: 'secret-locks', source: null, poster: null, captions: null, audio: null },
  { id: 'trick-market', source: null, poster: null, captions: null, audio: null },
  { id: 'message-station', source: null, poster: null, captions: null, audio: null },
];
```

Add these final-card records exactly:

```js
export const SAFETY_RULES = [
  { id: 'pause', label: 'Остановлюсь и не буду спешить' },
  { id: 'personal', label: 'Не покажу адрес, школу или телефон' },
  { id: 'secret', label: 'Не сообщу пароль или код подтверждения' },
  { id: 'check', label: 'Проверю странное сообщение другим способом' },
  { id: 'adult', label: 'Покажу ситуацию взрослому' },
];
export const TRUSTED_ADULT_ROLES = [
  { id: 'mother', label: 'Мама' }, { id: 'father', label: 'Папа' },
  { id: 'relative', label: 'Другой родственник' }, { id: 'teacher', label: 'Учитель' },
  { id: 'trusted-adult', label: 'Другой взрослый, которому доверяю' },
];
export const HABITS = [
  { id: 'check-photo', label: 'Проверю фото со взрослым перед публикацией' },
  { id: 'pause-before-click', label: 'Остановлюсь перед неожиданной ссылкой' },
  { id: 'keep-codes-secret', label: 'Не буду пересылать пароли и коды' },
];
```

`media/README.md` must list `city-intro`, `mirror-post`, `secret-locks`, `trick-market`, and `message-station`, each with `.mp4`, `.webp`, `.ru.vtt`, and `.ru.mp3` variants, and state that missing files are valid.

- [ ] **Step 4: Implement the media selector**

```js
export function getMediaModel(video) {
  const base = {
    source: video?.source ?? null,
    poster: video?.poster ?? null,
    captions: video?.captions ?? null,
    audio: video?.audio ?? null,
  };
  if (base.source) return { mode: 'video', ...base };
  if (base.audio) return { mode: 'audio', ...base };
  return { mode: 'placeholder', ...base };
}
```

- [ ] **Step 5: Verify GREEN**

Run: `cd cyber-expedition-demo && npm test`

Expected: all content and media tests PASS.

- [ ] **Step 6: Commit**

```bash
git add cyber-expedition-demo/src/content.js cyber-expedition-demo/src/media.js cyber-expedition-demo/media/README.md cyber-expedition-demo/tests/content.test.mjs cyber-expedition-demo/tests/adapters.test.mjs
git commit -m "feat: add safe expedition content contract"
```

### Task 3: Versioned Lesson State, Storage, and Reviewer Preview

**Files:**
- Create: `cyber-expedition-demo/src/lesson-state.js`
- Create: `cyber-expedition-demo/src/storage.js`
- Create: `cyber-expedition-demo/tests/state.test.mjs`
- Modify: `cyber-expedition-demo/tests/adapters.test.mjs`

**Interfaces:**
- Produces: `createInitialState(): LessonState`
- Produces: `transition(state, event): LessonState`
- Produces: `stateForPreview(stage): LessonState | null`
- Produces: `loadLesson()`, `saveLesson(state)`, `resetLesson()`
- `LessonState.mode`: `null | "child" | "preview"`
- Preview stages: `home`, `map`, `mirror`, `locks`, `traps`, `chat`, `voice`, `card`

- [ ] **Step 1: Write failing route and preview tests**

```js
test('child route unlocks districts sequentially', () => {
  let state = transition(createInitialState(), { type: 'CHOOSE_MODE', mode: 'child' });
  assert.equal(state.screen, 'intro-video');
  state = transition(state, { type: 'SKIP_MEDIA' });
  assert.equal(state.screen, 'map');
  assert.deepEqual(state.unlockedDistricts, ['mirror']);
});

test('reviewer can open every major activity with valid prerequisites', () => {
  const expected = {
    home: 'welcome', map: 'map', mirror: 'mirror-video', locks: 'locks-video',
    traps: 'traps-video', chat: 'chat', voice: 'voice-prepare', card: 'safety-card',
  };
  for (const [stage, screen] of Object.entries(expected)) {
    const state = stateForPreview(stage);
    assert.equal(state.screen, screen);
    assert.equal(state.mode, stage === 'home' ? null : 'preview');
  }
});

test('finishing a chapter awards one part and unlocks the next district', () => {
  let state = transition(stateForPreview('mirror'), { type: 'SKIP_MEDIA' });
  state = transition(state, { type: 'COMPLETE_CHAPTER', districtId: 'mirror' });
  assert.deepEqual(state.shieldParts, ['privacy']);
  assert.ok(state.unlockedDistricts.includes('locks'));
  assert.equal(state.screen, 'reward');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/state.test.mjs`

Expected: FAIL because state exports do not exist.

- [ ] **Step 3: Implement the versioned state**

```js
export function createInitialState() {
  return {
    version: 1, mode: null, screen: 'welcome', activeDistrict: null,
    unlockedDistricts: [], completedDistricts: [], shieldParts: [],
    chapter: {}, chatChoices: [], voiceMode: null, voiceStatus: 'idle',
    voiceTurns: [], voiceEvaluation: null,
    card: { rules: [], adultRole: null, habit: null },
  };
}

export function stateForPreview(stage) {
  const preview = {
    home: { screen: 'welcome', activeDistrict: null, completed: [] },
    map: { screen: 'map', activeDistrict: null, completed: [] },
    mirror: { screen: 'mirror-video', activeDistrict: 'mirror', completed: [] },
    locks: { screen: 'locks-video', activeDistrict: 'locks', completed: ['mirror'] },
    traps: { screen: 'traps-video', activeDistrict: 'traps', completed: ['mirror', 'locks'] },
    chat: { screen: 'chat', activeDistrict: 'messages', completed: ['mirror', 'locks', 'traps'] },
    voice: { screen: 'voice-prepare', activeDistrict: 'messages', completed: ['mirror', 'locks', 'traps'] },
    card: { screen: 'safety-card', activeDistrict: null, completed: ['mirror', 'locks', 'traps', 'messages'] },
  }[stage];
  if (!preview) return null;
  const state = createInitialState();
  state.mode = stage === 'home' ? null : 'preview';
  state.screen = preview.screen;
  state.activeDistrict = preview.activeDistrict;
  state.completedDistricts = preview.completed;
  state.unlockedDistricts = stage === 'home' ? [] : ['mirror', 'locks', 'traps', 'messages'];
  state.shieldParts = preview.completed.map((id) => ({ mirror: 'privacy', locks: 'secret', traps: 'check', messages: 'help' })[id]);
  return state;
}
```

Implement `CHOOSE_MODE`, `JUMP_TO_PREVIEW`, `SKIP_MEDIA`, `OPEN_DISTRICT`, `COMPLETE_CHAPTER`, `RETURN_TO_MAP`, `OPEN_VOICE`, `COMPLETE_VOICE`, `OPEN_CARD`, `UPDATE_CARD`, and `RESTART`. `CHOOSE_MODE("preview")` uses `stateForPreview("map")`; `JUMP_TO_PREVIEW` is accepted only in preview mode and replaces state with `stateForPreview(event.stage)`. Reject every other event that does not match the active screen.

- [ ] **Step 4: Implement guarded local persistence**

```js
const STORAGE_KEY = 'cyber-expedition-progress-v1';

export function loadLesson(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    return parsed?.version === 1 ? normalizeState(parsed) : createInitialState();
  } catch {
    return createInitialState();
  }
}
```

`normalizeState` starts from `createInitialState`, copies only known scalar fields and allow-listed IDs, removes duplicates, and recomputes `unlockedDistricts` and `shieldParts` from `completedDistricts`; it never trusts stored reward or unlock arrays.

Add adapter tests for corrupt JSON, unknown versions, unavailable storage, save/load, and reset.

- [ ] **Step 5: Verify GREEN**

Run: `cd cyber-expedition-demo && npm test`

Expected: all state and adapter tests PASS.

- [ ] **Step 6: Commit**

```bash
git add cyber-expedition-demo/src/lesson-state.js cyber-expedition-demo/src/storage.js cyber-expedition-demo/tests/state.test.mjs cyber-expedition-demo/tests/adapters.test.mjs
git commit -m "feat: add expedition route and preview state"
```

### Task 4: Shared UI, Mode Selection, Map, and Media Slots

**Files:**
- Create: `cyber-expedition-demo/src/ui.js`
- Create: `cyber-expedition-demo/src/app.js`
- Create: `cyber-expedition-demo/src/styles.css`
- Create: `cyber-expedition-demo/tests/e2e.mjs`
- Modify: `cyber-expedition-demo/index.html`

**Interfaces:**
- Consumes: `LessonState`, `DISTRICTS`, `getMediaModel(video)`
- Produces: `renderShell(state, content)`, `renderWelcome(state)`, `renderMap(state)`, `renderMediaSlot(state, video)`
- Produces DOM hooks: `[data-action]`, `[data-screen]`, `[data-preview-stage]`, `[data-district-id]`
- Produces: `eventFromControl(control): LessonEvent | null`

- [ ] **Step 1: Write the failing browser test**

```js
await page.goto(baseUrl);
assert.equal(await page.locator('[data-screen="welcome"]').count(), 1);
await page.locator('[data-action="CHOOSE_CHILD_MODE"]').click();
assert.equal(await page.locator('[data-screen="intro-video"]').count(), 1);
await page.locator('[data-action="SKIP_MEDIA"]').click();
assert.equal(await page.locator('[data-screen="map"]').count(), 1);
assert.equal(await page.locator('[data-district-id="mirror"]:not([disabled])').count(), 1);
assert.equal(await page.locator('[data-district-id="locks"][disabled]').count(), 1);
```

- [ ] **Step 2: Start the server, run E2E, and verify RED**

Run in terminal A: `cd cyber-expedition-demo && npm start`

Run in terminal B: `cd cyber-expedition-demo && npm run test:e2e`

Expected: FAIL because the application renderer is absent.

- [ ] **Step 3: Implement the shared renderers and event loop**

```js
const app = document.querySelector('#app');
let state = loadLesson();

function dispatch(event) {
  if (!event) return;
  state = transition(state, event);
  saveLesson(state);
  render();
}

app.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  dispatch(eventFromControl(control));
});

function eventFromControl(control) {
  if (control.dataset.action === 'CHOOSE_CHILD_MODE') return { type: 'CHOOSE_MODE', mode: 'child' };
  if (control.dataset.action === 'CHOOSE_PREVIEW_MODE') return { type: 'CHOOSE_MODE', mode: 'preview' };
  if (control.dataset.action === 'SKIP_MEDIA') return { type: 'SKIP_MEDIA' };
  if (control.dataset.action === 'OPEN_DISTRICT') return { type: 'OPEN_DISTRICT', districtId: control.dataset.districtId };
  if (control.dataset.action === 'JUMP_TO_PREVIEW') return { type: 'JUMP_TO_PREVIEW', stage: control.dataset.previewStage };
  return control.dataset.action ? { type: control.dataset.action } : null;
}
```

`renderWelcome` must show both mode buttons. `renderShell` shows progress and reviewer navigation only when `state.mode === 'preview'`. `renderMediaSlot` renders `<video>` with a Russian `<track>` when configured and an illustrated placeholder otherwise.

- [ ] **Step 4: Add the responsive visual foundation**

```css
:root { color-scheme: light; font-family: system-ui, sans-serif; }
.lesson-shell { width:min(1440px,calc(100% - 36px)); margin:18px auto; }
button:focus-visible { outline:4px solid #ffd85f; outline-offset:4px; }
@media (max-width:620px) { .lesson-shell { width:100%; margin:0; } }
@media (prefers-reduced-motion:reduce) {
  *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; }
}
```

Create the four district themes with CSS custom properties and a printable `.safety-card` baseline.

- [ ] **Step 5: Verify GREEN on desktop and mobile**

Extend E2E with viewports `1280x800` and `390x844`, assert `documentElement.scrollWidth === documentElement.clientWidth`, keyboard activation of both start buttons, and one visible `h1`.

Run: `cd cyber-expedition-demo && npm run test:e2e`

Expected: PASS with no console errors or external requests.

- [ ] **Step 6: Commit**

```bash
git add cyber-expedition-demo/index.html cyber-expedition-demo/src/app.js cyber-expedition-demo/src/ui.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add expedition shell and city map"
```

### Task 5: Mirror Garden Safe-Post Game

**Files:**
- Create: `cyber-expedition-demo/src/chapters/mirror.js`
- Create: `cyber-expedition-demo/tests/chapters.test.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Produces: `MIRROR_DETAILS`, `MIRROR_CAPTIONS`
- Produces: `createMirrorState()`, `updateMirror(state, event)`, `evaluateMirror(state)`, `renderMirror(state)`
- `evaluateMirror` returns `{ complete, found, missed, safeCaption, hint }`

- [ ] **Step 1: Write failing chapter-rule tests**

```js
test('safe post requires every identifying detail and a safe caption', () => {
  let state = createMirrorState();
  for (const detailId of ['school-sign', 'geotag', 'pass-card', 'house-number']) {
    state = updateMirror(state, { type: 'TOGGLE_DETAIL', detailId });
  }
  state = updateMirror(state, { type: 'CHOOSE_CAPTION', captionId: 'cat-day' });
  assert.deepEqual(evaluateMirror(state), {
    complete: true, found: 4, missed: [], safeCaption: true, hint: null,
  });
});

test('neutral details do not count and a partial answer gets one category hint', () => {
  let state = updateMirror(createMirrorState(), { type: 'TOGGLE_DETAIL', detailId: 'cat' });
  const result = evaluateMirror(state);
  assert.equal(result.complete, false);
  assert.match(result.hint, /место|школ/i);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/chapters.test.mjs`

Expected: FAIL because the mirror module does not exist.

- [ ] **Step 3: Implement the pure game and renderer**

```js
export const MIRROR_DETAILS = [
  { id: 'school-sign', category: 'school', risky: true },
  { id: 'geotag', category: 'location', risky: true },
  { id: 'pass-card', category: 'identity', risky: true },
  { id: 'house-number', category: 'address', risky: true },
  { id: 'cat', category: 'subject', risky: false },
  { id: 'cloud', category: 'background', risky: false },
];

export function evaluateMirror(state) {
  const risky = MIRROR_DETAILS.filter((item) => item.risky);
  const missed = risky.filter((item) => !state.selectedDetails.includes(item.id));
  const safeCaption = state.captionId === 'cat-day';
  return { complete: missed.length === 0 && safeCaption, found: risky.length - missed.length,
    missed: missed.map((item) => item.id), safeCaption, hint: hintFor(missed[0]) };
}
```

Render hotspots as accessible buttons with visible labels, a three-choice caption panel, partial hint, and a before/after comparison. Dispatch `COMPLETE_CHAPTER` only after `evaluateMirror(state).complete`.

- [ ] **Step 4: Add and pass E2E coverage**

Test the incomplete hint, selection of all four risky details, safe caption, before/after result, reward screen, and unlocked `locks` district.

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cyber-expedition-demo/src/chapters/mirror.js cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/chapters.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add safe post mirror game"
```

### Task 6: Secret Castle Password and 2FA Game

**Files:**
- Create: `cyber-expedition-demo/src/chapters/locks.js`
- Modify: `cyber-expedition-demo/tests/chapters.test.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Produces: `PASSWORD_CARDS`, `PHRASE_CARDS`, `TWO_FACTOR_STEPS`
- Produces: `createLocksState()`, `updateLocks(state, event)`, `evaluateLocks(state)`, `renderLocks(state)`
- No free-text input is accepted by this chapter.

- [ ] **Step 1: Write failing password and 2FA tests**

```js
test('obvious training passwords are rejected without collecting user text', () => {
  assert.equal(classifyPasswordCard('digits'), 'weak');
  assert.equal(classifyPasswordCard('hero-name'), 'weak');
  assert.equal(classifyPasswordCard('long-random-phrase'), 'stronger');
});

test('castle completes only after a long phrase and the correct second-lock order', () => {
  let state = createLocksState();
  for (const cardId of ['rocket', 'forest', 'teacup']) state = updateLocks(state, { type: 'ADD_PHRASE_CARD', cardId });
  for (const stepId of ['password', 'trusted-device', 'keep-code-secret']) state = updateLocks(state, { type: 'SELECT_2FA_STEP', stepId });
  assert.equal(evaluateLocks(state).complete, true);
  assert.equal('freeText' in state, false);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/chapters.test.mjs`

Expected: FAIL because `locks.js` does not exist.

- [ ] **Step 3: Implement three bounded mini-games**

```js
export const TWO_FACTOR_STEPS = [
  { id: 'password', order: 0, label: 'Открыть первый замок секретной фразой' },
  { id: 'trusted-device', order: 1, label: 'Подтвердить вход на доверенном устройстве' },
  { id: 'keep-code-secret', order: 2, label: 'Никому не отправлять код подтверждения' },
];
```

The renderer must use selectable cards only. Display the assembled phrase as decorative training tokens and discard it when leaving the chapter. A wrong 2FA order shows a hint and preserves completed earlier mini-games.

- [ ] **Step 4: Add and pass E2E coverage**

Assert there is no text/password input, weak-card explanations are child-friendly, three phrase cards are required, wrong 2FA order produces a hint, and the correct sequence awards `secret`.

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cyber-expedition-demo/src/chapters/locks.js cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/chapters.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add password and second lock game"
```

### Task 7: Trick Market Detective Cases

**Files:**
- Create: `cyber-expedition-demo/src/chapters/traps.js`
- Modify: `cyber-expedition-demo/tests/chapters.test.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Produces: `TRAP_CASES`
- Produces: `createTrapsState()`, `updateTraps(state, event)`, `evaluateTrapCase(state)`, `renderTraps(state)`
- Each case contains literal `clues`, `actions`, and one or more `safe` actions.

- [ ] **Step 1: Write failing clue and safe-action tests**

```js
test('every trap case contains urgency, reward or secrecy evidence and a safe adult action', () => {
  assert.equal(TRAP_CASES.length, 3);
  for (const item of TRAP_CASES) {
    assert.ok(item.clues.filter((clue) => clue.risky).length >= 3);
    assert.ok(item.actions.some((action) => action.id === 'tell-adult' && action.safe));
  }
});

test('case advances only after all risky clues and one safe action', () => {
  let state = createTrapsState();
  for (const clueId of ['prize', 'timer', 'secret-request']) state = updateTraps(state, { type: 'TOGGLE_CLUE', clueId });
  state = updateTraps(state, { type: 'CHOOSE_ACTION', actionId: 'tell-adult' });
  assert.equal(evaluateTrapCase(state).complete, true);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/chapters.test.mjs`

Expected: FAIL because `traps.js` does not exist.

- [ ] **Step 3: Implement three cases and forgiving feedback**

```js
export const TRAP_CASES = [
  makeTrapCase('prize-message', ['prize', 'timer', 'secret-request']),
  makeTrapCase('screen-code', ['screenshot', 'confirmation-code', 'unknown-contact']),
  makeTrapCase('friend-link', ['unusual-style', 'unexpected-link', 'password-request']),
];

function makeTrapCase(id, riskyClueIds) {
  return {
    id,
    clues: riskyClueIds.map((clueId) => ({ id: clueId, risky: true })),
    actions: [
      { id: 'follow-request', safe: false },
      { id: 'tell-adult', safe: true },
    ],
  };
}
```

Incomplete clue submissions reveal one category hint. Unsafe actions return to the decision after explaining the trick; they never erase found clues. The final branch accepts `verify-another-way`, `block-contact`, or `tell-adult` as safe and always includes telling an adult in the summary.

- [ ] **Step 4: Add and pass E2E coverage**

Test one incomplete attempt, one unsafe action retry, all three cases, the `check` shield part, and return to the map.

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cyber-expedition-demo/src/chapters/traps.js cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/chapters.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add trick market detective cases"
```

### Task 8: Deterministic Safe-Communication Chat

**Files:**
- Create: `cyber-expedition-demo/src/chapters/chat.js`
- Modify: `cyber-expedition-demo/tests/chapters.test.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Produces: `CHAT_NODES`, `getChatNode(id)`, `chooseChatReply(nodeId, replyId)`
- Produces: `evaluateChatChoices(choices): { protectedData, avoidedEscalation, soughtHelp, summary }`
- Produces: `renderChat(state)`, `renderChatResult(state)`

- [ ] **Step 1: Write failing chat-graph tests**

```js
test('safe stranger branch protects data and reaches an adult', () => {
  const first = chooseChatReply('pass-request', 'refuse-photo');
  const second = chooseChatReply(first.nextNodeId, 'stop-and-tell');
  const result = evaluateChatChoices([first.choice, second.choice]);
  assert.deepEqual(result, {
    protectedData: true, avoidedEscalation: true, soughtHelp: true,
    summary: 'Ты сохранил личные данные, остановил разговор и выбрал помощь взрослого.',
  });
});

test('bullying branch rewards evidence and help without requiring a rude reply', () => {
  const result = evaluateChatChoices([
    { skill: 'avoid-escalation', met: true }, { skill: 'seek-help', met: true },
  ]);
  assert.equal(result.avoidedEscalation, true);
  assert.equal(result.soughtHelp, true);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/chapters.test.mjs`

Expected: FAIL because chat exports do not exist.

- [ ] **Step 3: Implement the validated graph and result model**

Every reply ID must be validated against the current node. Forged node IDs, reply IDs, or safety values return `null`. Provide one stranger branch and one short bullying branch; both end with a concrete safe exit.

```js
export function chooseChatReply(nodeId, replyId) {
  const node = getChatNode(nodeId);
  const reply = node?.replies.find((item) => item.id === replyId);
  if (!reply) return null;
  return { nextNodeId: reply.nextNodeId, finished: Boolean(reply.finished), choice: toChoice(node, reply) };
}

function toChoice(node, reply) {
  return { nodeId: node.id, replyId: reply.id, skill: reply.skill, met: reply.met === true };
}
```

- [ ] **Step 4: Add and pass E2E coverage**

Assert chat history grows, unsafe choices remain recoverable, the result shows three separate skills, and continuing opens `voice-prepare` without awarding `help` yet.

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cyber-expedition-demo/src/chapters/chat.js cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/chapters.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add safe communication chat"
```

### Task 9: Bounded Voice Demo and Privacy Detector

**Files:**
- Create: `cyber-expedition-demo/src/voice-scenario.js`
- Modify: `cyber-expedition-demo/tests/chapters.test.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`

**Interfaces:**
- Produces: `VOICE_SCENARIO`, `getDemoMentorTurn(index)`, `getDemoReplyOptions(index)`
- Produces: `evaluateDemoVoice(turns)` matching the server evaluation shape
- Produces: `containsSensitivePattern(text): boolean`

- [ ] **Step 1: Write failing bounded-scenario tests**

```js
test('voice demo has at most four fictional mentor turns and no real-data request', () => {
  assert.ok(VOICE_SCENARIO.questions.length <= 4);
  assert.doesNotMatch(JSON.stringify(VOICE_SCENARIO), /назови (?:имя|адрес|школу|телефон)/i);
});

test('privacy detector catches likely phone, email, password and address disclosures', () => {
  for (const text of ['+375 29 123-45-67', 'я живу на улице Лесной 4', 'мой пароль qwerty', 'test@example.com']) {
    assert.equal(containsSensitivePattern(text), true);
  }
  assert.equal(containsSensitivePattern('Я не скажу секрет и позову взрослого'), false);
});

test('safe demo replies satisfy all three evaluation criteria', () => {
  const result = evaluateDemoVoice([
    { role: 'user', text: 'Меня торопят и просят секрет.' },
    { role: 'user', text: 'Я не открою ссылку.' },
    { role: 'user', text: 'Я покажу сообщение взрослому.' },
  ]);
  assert.equal(result.signals.met, true);
  assert.equal(result.safeAction.met, true);
  assert.equal(result.trustedAdult.met, true);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/chapters.test.mjs`

Expected: FAIL because `voice-scenario.js` does not exist.

- [ ] **Step 3: Implement the fixed scenario, demo turns, and local evaluation**

Use only preset text replies in demo mode. Normalize each turn to 500 characters and cap the transcript at 12 turns. On `containsSensitivePattern(userText)`, clear the transcript, end the role-play, and display a privacy reminder instead of an evaluation.

```js
export const VOICE_SCENARIO = {
  title: 'Подарок в игровом чате',
  maxDurationMs: 90_000,
  questions: [
    'Что в этом обещании кажется подозрительным?',
    'Чего ты точно не станешь делать?',
    'Какой безопасный шаг сделаешь сейчас?',
    'Какому взрослому можно рассказать?',
  ],
};

export function containsSensitivePattern(text) {
  const value = String(text).toLowerCase();
  return /\b[\w.+-]+@[\w.-]+\.[a-zа-я]{2,}\b/i.test(value)
    || /(?:\+?\d[\s()-]*){7,}/.test(value)
    || /\b(?:мой|моя|настоящ(?:ий|ая))\s+(?:пароль|адрес|школа|телефон|логин)\b/i.test(value)
    || /\b(?:живу|адрес)\b.{0,35}\b(?:улиц|дом|квартир)/i.test(value);
}


export function evaluateDemoVoice(turns) {
  const text = turns.slice(0, 12).map((turn) => String(turn.text).slice(0, 500).toLowerCase()).join(' ');
  const criterion = (met, yes, no) => ({ met, feedback: met ? yes : no });
  return {
    signals: criterion(/тороп|секрет|подозр|незнаком/.test(text), 'Ты заметил тревожный сигнал.', 'Назови, что именно кажется подозрительным.'),
    safeAction: criterion(/не откро|не нажм|останов|заблок/.test(text), 'Ты выбрал безопасное действие.', 'Скажи, что не станешь открывать или нажимать.'),
    trustedAdult: criterion(/взросл|родител|учител/.test(text), 'Ты решил обратиться к взрослому.', 'Добавь, какому взрослому расскажешь.'),
    summary: 'Проверяем: заметил ли ты сигнал, остановился ли и обратился ли за помощью.',
  };
}
```

- [ ] **Step 4: Render and verify the text demo**

Add `voice-prepare`, `voice-live[data-mode="demo"]`, `voice-result`, privacy-reminder, preset replies, and three criterion cards. E2E must complete the demo with three safe replies and assert all criteria are met.

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: PASS without an API key or microphone.

- [ ] **Step 5: Commit**

```bash
git add cyber-expedition-demo/src/voice-scenario.js cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/chapters.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add bounded voice training demo"
```

### Task 10: Server-Safe OpenAI Realtime Voice

**Files:**
- Create: `cyber-expedition-demo/.env.example`
- Create: `cyber-expedition-demo/server/openai.mjs`
- Create: `cyber-expedition-demo/src/realtime-client.js`
- Create: `cyber-expedition-demo/src/voice-api.js`
- Modify: `cyber-expedition-demo/server/serve.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/tests/server.test.mjs`
- Modify: `cyber-expedition-demo/tests/adapters.test.mjs`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Server: `POST /api/realtime/session` accepts `application/sdp`, returns `application/sdp`
- Server: `POST /api/voice/evaluate` accepts `{ turns }`, returns `{ ok, evaluation }`
- Produces: `createOpenAIService({ apiKey, realtimeModel, realtimeVoice, evaluationModel, fetchImpl })`
- Produces: `createRealtimeClient(dependencies)` with `connect`, `setMuted`, `close`
- Produces: `createVoiceApi({ fetchImpl, baseUrl, timeoutMs })` with `health`, `createSession`, `evaluate`

- [ ] **Step 1: Write failing server-boundary tests**

```js
test('server preserves terminal CRLF while proxying SDP', async () => {
  const offer = 'v=0\r\na=group:BUNDLE 0 1\r\n';
  const response = await fetch(`${baseUrl}/api/realtime/session`, {
    method: 'POST', headers: { 'content-type': 'application/sdp' }, body: offer,
  });
  assert.equal(response.status, 200);
  assert.equal(forwardedSdp, offer);
});

test('server redacts upstream failures', async () => {
  const server = createLessonServer({
    rootDir: process.cwd(), env: { OPENAI_API_KEY: 'secret-test-key' },
    fetchImpl: async () => new Response('secret-test-key account detail', { status: 401 }),
  });
  const running = await listen(server);
  try {
    const response = await fetch(`${running.baseUrl}/api/realtime/session`, {
      method: 'POST', headers: { 'content-type': 'application/sdp' }, body: 'v=0\r\n',
    });
    const body = await response.text();
    assert.equal(response.status, 502);
    assert.deepEqual(JSON.parse(body), { ok: false, code: 'REALTIME_UNAVAILABLE' });
    assert.doesNotMatch(body, /secret-test-key/);
  } finally {
    await running.close();
  }
});
```

Add tests for content types, 64 KiB SDP limit, 32 KiB evaluation limit, 30 API requests per minute per address, 1–12 normalized turns, structured evaluation validation, and demo-mode `503` responses.

- [ ] **Step 2: Write failing browser-adapter tests**

```js
test('realtime client owns and closes microphone resources', async () => {
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
  const peer = {
    closed: false, addTrack() {}, createOffer: async () => ({ sdp: 'v=0\r\n' }),
    setLocalDescription: async () => {}, setRemoteDescription: async () => {},
    close() { this.closed = true; },
  };
  const fakeDependencies = {
    getUserMedia: async () => ({ getTracks: () => [track] }),
    createPeerConnection: () => peer,
    createAudioElement: () => ({ autoplay: false, srcObject: null, remove() {} }),
    setTimeoutImpl: () => 1, clearTimeoutImpl: () => {},
  };
  const callbacks = { createSession: async () => 'v=0\r\n', onTurn() {}, onStatus() {}, onError() {} };
  const client = createRealtimeClient(fakeDependencies);
  await client.connect(callbacks);
  client.setMuted(true);
  assert.equal(track.enabled, false);
  client.close();
  assert.equal(track.stopped, true);
  assert.equal(peer.closed, true);
});
```

- [ ] **Step 3: Run targeted tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/server.test.mjs tests/adapters.test.mjs`

Expected: FAIL because OpenAI and Realtime adapters do not exist.

- [ ] **Step 4: Implement server routes and OpenAI service**

```dotenv
OPENAI_API_KEY=
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_REALTIME_VOICE=marin
OPENAI_EVALUATION_MODEL=gpt-5-mini
PORT=4177
```

Use multipart `FormData` with `sdp` and a server-owned `session` object. Preserve the SDP body exactly; use `.trim()` only to validate that it is non-empty. The Realtime prompt limits the fictional stranger to four short Russian turns, forbids requesting or repeating real data, and ends with a clear training-complete line. The evaluation request uses a strict JSON schema for `signals`, `safeAction`, `trustedAdult`, and `summary`.

```js
const EVALUATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['signals', 'safeAction', 'trustedAdult', 'summary'],
  properties: {
    signals: { $ref: '#/$defs/criterion' }, safeAction: { $ref: '#/$defs/criterion' },
    trustedAdult: { $ref: '#/$defs/criterion' },
    summary: { type: 'string', minLength: 1, maxLength: 160 },
  },
  $defs: { criterion: { type: 'object', additionalProperties: false,
    required: ['met', 'feedback'], properties: {
      met: { type: 'boolean' }, feedback: { type: 'string', minLength: 1, maxLength: 160 },
    } } },
};
```

- [ ] **Step 5: Implement browser adapters and app integration**

```js
const voiceApi = createVoiceApi();
const realtime = createRealtimeClient();
await realtime.connect({
  createSession: (sdp) => voiceApi.createSession(sdp),
  onTurn: (turn) => dispatch({ type: 'ADD_VOICE_TURN', turn }),
  onStatus: (status) => dispatch({ type: 'SET_VOICE_STATUS', status }),
  onError: () => dispatch({ type: 'RETURN_TO_VOICE_PREPARE', error: true }),
});
```

Close the client and clear its 90-second timer on completion, error, restart, quick navigation, and `beforeunload`. When a user transcript matches `containsSensitivePattern`, close immediately, clear turns, and show the privacy reminder.

- [ ] **Step 6: Verify GREEN without spending live API usage**

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: all mocked server and adapter tests PASS; E2E verifies demo mode and the live button's enabled/disabled health behavior without starting a paid session.

- [ ] **Step 7: Commit**

```bash
git add cyber-expedition-demo/.env.example cyber-expedition-demo/server/openai.mjs cyber-expedition-demo/server/serve.mjs cyber-expedition-demo/src/realtime-client.js cyber-expedition-demo/src/voice-api.js cyber-expedition-demo/src/app.js cyber-expedition-demo/tests/server.test.mjs cyber-expedition-demo/tests/adapters.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add safe realtime voice coaching"
```

### Task 11: Final Shield and Downloadable Safety Card

**Files:**
- Create: `cyber-expedition-demo/src/final-card.js`
- Create: `cyber-expedition-demo/tests/final-card.test.mjs`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Produces: `createCardModel(cardState): { rules, adultRole, habit } | null`
- Produces: `renderSafetyCard(model): string`
- Produces: `drawSafetyCard(canvas, model): void`
- Produces: `downloadSafetyCard(canvas, documentImpl): void`

- [ ] **Step 1: Write failing safe-card tests**

```js
test('card requires exactly three rules, one adult role, and one habit', () => {
  assert.deepEqual(createCardModel({ rules: ['pause', 'secret', 'adult'], adultRole: 'teacher', habit: 'check-photo' }), {
    rules: ['pause', 'secret', 'adult'], adultRole: 'teacher', habit: 'check-photo',
  });
  assert.equal(createCardModel({ rules: ['pause'], adultRole: 'teacher', habit: null }), null);
});

test('card choices contain roles but no fields for identifying data', () => {
  assert.doesNotMatch(JSON.stringify(TRUSTED_ADULT_ROLES), /телефон|имя|адрес/i);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd cyber-expedition-demo && node --test tests/final-card.test.mjs`

Expected: FAIL because `final-card.js` does not exist.

- [ ] **Step 3: Implement shield assembly and card selection**

Render the four earned parts joining into one shield, then present card choices. Preview mode seeds all parts; child mode reaches the card only after `help` is awarded. Use checkboxes constrained to exactly three rules and single-choice role/habit buttons.

```js
export function createCardModel(card) {
  if (card.rules.length !== 3 || !card.adultRole || !card.habit) return null;
  if (!card.rules.every((id) => SAFETY_RULES.some((item) => item.id === id))) return null;
  if (!TRUSTED_ADULT_ROLES.some((item) => item.id === card.adultRole)) return null;
  if (!HABITS.some((item) => item.id === card.habit)) return null;
  return { rules: [...card.rules], adultRole: card.adultRole, habit: card.habit };
}
```

- [ ] **Step 4: Implement PNG and print paths**

Draw a fixed `1200x1600` Canvas using only validated labels from content. Create a temporary `<a download="cyber-expedition-card.png">` from `canvas.toDataURL('image/png')`. Add `@media print` rules that hide navigation and controls and print only the card.

- [ ] **Step 5: Add and pass E2E coverage**

Use Playwright's download event to assert the PNG filename, click print with a stubbed `window.print`, reload and confirm the safe card restores, and confirm no free-text inputs exist.

Run: `cd cyber-expedition-demo && npm test && npm run test:e2e`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cyber-expedition-demo/src/final-card.js cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/final-card.test.mjs cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: add printable safety card finale"
```

### Task 12: Full Route, Reviewer Navigation, Documentation, and Final Verification

**Files:**
- Create: `cyber-expedition-demo/README.md`
- Modify: `cyber-expedition-demo/src/app.js`
- Modify: `cyber-expedition-demo/src/styles.css`
- Modify: `cyber-expedition-demo/tests/e2e.mjs`

**Interfaces:**
- Consumes all prior public interfaces.
- Produces a complete child route and direct preview routes with no new domain API.

- [ ] **Step 1: Extend E2E into one complete child journey**

```js
async function chooseMode(mode) {
  await page.locator(`[data-action="CHOOSE_${mode.toUpperCase()}_MODE"]`).click();
}
async function skipConfiguredMedia() {
  const skip = page.locator('[data-action="SKIP_MEDIA"]');
  if (await skip.count()) await skip.click();
}
async function completeMirrorChapter() {
  await page.locator('[data-district-id="mirror"]').click(); await skipConfiguredMedia();
  for (const id of ['school-sign', 'geotag', 'pass-card', 'house-number']) await page.locator(`[data-mirror-detail="${id}"]`).click();
  await page.locator('[data-mirror-caption="cat-day"]').click(); await page.locator('[data-action="SUBMIT_MIRROR"]').click();
  await page.locator('[data-action="CLAIM_REWARD"]').click();
}
async function completeLocksChapter() {
  await page.locator('[data-district-id="locks"]').click(); await skipConfiguredMedia();
  for (const id of ['digits', 'hero-name', 'long-random-phrase']) await page.locator(`[data-password-card="${id}"]`).click();
  for (const id of ['rocket', 'forest', 'teacup']) await page.locator(`[data-phrase-card="${id}"]`).click();
  for (const id of ['password', 'trusted-device', 'keep-code-secret']) await page.locator(`[data-2fa-step="${id}"]`).click();
  await page.locator('[data-action="CLAIM_REWARD"]').click();
}
async function completeTrapsChapter() {
  await page.locator('[data-district-id="traps"]').click(); await skipConfiguredMedia();
  for (const caseId of ['prize-message', 'screen-code', 'friend-link']) {
    const clues = await page.locator(`[data-trap-case="${caseId}"] [data-risky="true"]`).evaluateAll((nodes) => nodes.map((node) => node.dataset.clueId));
    for (const id of clues) await page.locator(`[data-clue-id="${id}"]`).click();
    await page.locator('[data-action="SUBMIT_TRAP_CLUES"]').click(); await page.locator('[data-trap-action="tell-adult"]').click();
    await page.locator('[data-action="NEXT_TRAP_CASE"]').click();
  }
  await page.locator('[data-action="CLAIM_REWARD"]').click();
}
async function completeChatAndDemoVoice() {
  await page.locator('[data-district-id="messages"]').click(); await skipConfiguredMedia();
  for (const reply of ['refuse-photo', 'stop-and-tell']) await page.locator(`[data-chat-reply="${reply}"]`).click();
  await page.locator('[data-action="CONTINUE_TO_VOICE"]').click(); await page.locator('[data-voice-mode="demo"]').click();
  for (const reply of ['spot-secret', 'refuse-link', 'tell-adult']) await page.locator(`[data-demo-reply="${reply}"]`).click();
  await page.locator('[data-action="CLAIM_REWARD"]').click();
}
async function completeSafetyCard() {
  for (const id of ['pause', 'secret', 'adult']) await page.locator(`[data-card-rule="${id}"]`).click();
  await page.locator('[data-adult-role="teacher"]').click(); await page.locator('[data-habit="check-photo"]').click();
  await page.locator('[data-action="CREATE_CARD"]').click();
}

await chooseMode('child');
await skipConfiguredMedia();
await completeMirrorChapter();
await completeLocksChapter();
await completeTrapsChapter();
await completeChatAndDemoVoice();
await completeSafetyCard();
assert.equal(await page.locator('[data-screen="safety-card"]').count(), 1);
assert.match(await page.locator('[data-shield-counter]').innerText(), /4\/4/);
```

Add a second journey that chooses preview mode and directly opens `map`, `mirror`, `locks`, `traps`, `chat`, `voice`, and `card`, asserting each screen and seeded prerequisites. Capture console errors and external requests; both arrays must remain empty in demo mode.

- [ ] **Step 2: Run E2E and verify RED**

Run: `cd cyber-expedition-demo && npm run test:e2e`

Expected: FAIL because the full route does not yet reach `safety-card` or a preview stage lacks its seeded prerequisites.

- [ ] **Step 3: Complete route wiring and presentation polish**

Ensure every reward returns to the map, every current district has `aria-current`, locked districts explain the prerequisite, quick navigation closes live voice resources, focus moves to the new `h1`, and restart requires confirmation. Add visible `AI-generated voice and illustrations` disclosure near media and voice controls.

```js
function navigatePreview(stage) {
  closeVoiceResources();
  const next = stateForPreview(stage);
  if (!next) return;
  state = next;
  storeAndRender();
}
```

- [ ] **Step 4: Write the operational README**

Document these exact commands:

```bash
cd cyber-expedition-demo
npm install
cp .env.example .env
npm start
```

Explain `http://127.0.0.1:4177/`, demo mode without a key, server-only `OPENAI_API_KEY`, media filenames, captions, the two start modes, privacy boundaries, and `npm test` / `npm run test:e2e`.

- [ ] **Step 5: Run full verification**

Run:

```bash
cd cyber-expedition-demo
npm test
npm run test:e2e
git diff --check
```

Expected: all unit tests PASS, E2E exits `0`, no console errors, no unexpected external requests, and `git diff --check` prints nothing.

- [ ] **Step 6: Perform one controlled live-voice smoke test**

With a valid local `.env`, use a fake browser microphone to create one Realtime session, wait for `voiceStatus !== "connecting"`, close immediately, and assert:

```json
{ "sessionStatus": 200, "screen": "voice-live", "errorVisible": 0 }
```

Do not print the key or upstream payloads. If no key is available, record the smoke test as skipped while keeping all mocked tests mandatory.

- [ ] **Step 7: Commit**

```bash
git add cyber-expedition-demo/README.md cyber-expedition-demo/src/app.js cyber-expedition-demo/src/styles.css cyber-expedition-demo/tests/e2e.mjs
git commit -m "feat: complete cyber expedition showcase"
```

---

## Final Acceptance Checklist

- [ ] Existing `digital-map-lesson/` and `voice-help-lesson/` have no new diff from this implementation.
- [ ] Child mode completes four chapters sequentially and ends with four shield parts.
- [ ] Preview mode opens every major activity directly with consistent state.
- [ ] Every media slot works with no file configured and supports captions when a file is present.
- [ ] No chapter asks for identifying data or accepts a real password.
- [ ] Chat is deterministic and recoverable after an unsafe choice.
- [ ] Voice works as a text demo without a key and as bounded Realtime with a key.
- [ ] Microphone and peer connection close on finish, error, restart, navigation, and unload.
- [ ] Final card contains only selected rules, an adult role, and a habit; PNG and print paths work.
- [ ] Desktop, mobile, keyboard, reduced-motion, storage recovery, and refresh behavior pass automated checks.
- [ ] README contains exact local setup, voice, media, test, and privacy instructions.
