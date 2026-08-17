# Digital Map Chat and Realtime Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the complete `digital-map-lesson` and add exactly one branching text-chat task after the map plus exactly one OpenAI Realtime voice-coaching task after the three existing expedition cases.

**Architecture:** Extend the existing pure lesson state machine with two bounded feature modules: a deterministic local chat scenario and a WebRTC voice adapter. Replace the static development server with a small Node server that keeps `OPENAI_API_KEY` server-side, proxies the Realtime SDP handshake, and validates a separate structured evaluation response; every external dependency has a deterministic demo fallback.

**Tech Stack:** Browser ES modules, semantic HTML/CSS, Node.js built-in HTTP/test APIs, native `fetch`/`FormData`, WebRTC, OpenAI Realtime API and Responses API, Playwright for end-to-end verification.

## Global Constraints

- Modify only `digital-map-lesson`; leave `cyberkids-wow` and `voice-help-lesson` intact.
- Keep all existing cards, map choices, three expedition cases, four crystals, shield ordering, final screen, visual language, and restart behavior.
- Insert chat after map and voice after the final expedition case but before the shield.
- The text chat has preset replies only and makes no external requests.
- The voice assistant is a safe mentor, never an impersonated attacker, and asks no real personal data.
- `OPENAI_API_KEY` stays on the server and must never appear in browser assets, API responses, logs, or Git.
- Real browser audio uses WebRTC through the unified `/v1/realtime/calls` flow.
- The complete lesson remains passable in an honestly labeled demo mode without a key, microphone, WebRTC support, or network.
- Do not persist audio, SDP, incomplete transcripts, or server-side conversation history.
- Automated tests make no real OpenAI calls and consume no API quota.
- Real use by children under 13 or the applicable digital-consent age requires the customer's consent/privacy review and prior Zero Data Retention setup when personal data may be processed.

## File Structure

**Create:**

- `digital-map-lesson/src/chat-scenario.js` — deterministic chat nodes, reply validation, branch scoring, and local feedback.
- `digital-map-lesson/src/voice-scenario.js` — fixed fictional situation, mentor questions, demo turns, criteria, and safe fallback evaluation.
- `digital-map-lesson/src/realtime-client.js` — injectable WebRTC lifecycle and normalized conversation events.
- `digital-map-lesson/src/voice-api.js` — health/session/evaluation browser API adapter.
- `digital-map-lesson/server/openai.mjs` — bounded OpenAI Realtime handshake and structured evaluation calls.
- `digital-map-lesson/server/serve.mjs` — static server plus the three safe API routes.
- `digital-map-lesson/tests/chat-scenario.test.mjs` — chat branch tests.
- `digital-map-lesson/tests/realtime-client.test.mjs` — WebRTC adapter tests with fakes.
- `digital-map-lesson/tests/server.test.mjs` — API tests with injected upstream fetch.

**Modify:**

- `digital-map-lesson/src/lesson-state.js` — version 2 state and transitions for chat and voice screens.
- `digital-map-lesson/src/storage.js` — version 1 to version 2 migration and new-field validation.
- `digital-map-lesson/src/app.js` — render and coordinate chat, demo voice, Realtime voice, evaluation, recovery, and progress labels.
- `digital-map-lesson/src/styles.css` — responsive chat and voice presentation, statuses, feedback, focus, reduced motion.
- `digital-map-lesson/tests/state.test.mjs` — route placement and restart assertions.
- `digital-map-lesson/tests/adapters.test.mjs` — storage migration and voice API adapter tests.
- `digital-map-lesson/tests/e2e.mjs` — complete deterministic demo journey through both new tasks.
- `digital-map-lesson/package.json` — run the new server and expose unit/E2E commands.
- `digital-map-lesson/README.md` — setup, environment, demo/real behavior, privacy, and manual microphone QA.
- `.gitignore` — ignore `digital-map-lesson/.env` while keeping `.env.example` trackable.

**Create configuration:**

- `digital-map-lesson/.env.example` — `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`, and `OPENAI_EVALUATION_MODEL` without secrets.

---

### Task 1: Version 2 lesson state and storage migration

**Files:**
- Modify: `digital-map-lesson/src/lesson-state.js`
- Modify: `digital-map-lesson/src/storage.js`
- Modify: `digital-map-lesson/tests/state.test.mjs`
- Modify: `digital-map-lesson/tests/adapters.test.mjs`

**Interfaces:**
- Produces: `createInitialState()` with `version: 2`, `chatNodeId`, `chatChoices`, `chatResult`, `voiceMode`, `voiceStatus`, `voiceTurns`, and `voiceEvaluation`.
- Produces: `transition(state, event)` support for `CHAT_REPLY`, `CONTINUE_CHAT`, `START_VOICE_DEMO`, `START_VOICE_LIVE`, `SET_VOICE_STATUS`, `ADD_VOICE_TURN`, `FINISH_VOICE`, `SET_VOICE_EVALUATION`, and `CONTINUE_VOICE`.
- Produces: `migrateState(value): LessonState | null` inside `storage.js`.

- [ ] **Step 1: Write failing route and migration tests**

Add focused assertions such as:

```js
test('confirming a valid map enters chat before expedition', () => {
  let state = { ...createInitialState(), screen: 'map', selectedPlaces: ['games', 'messages', 'device'] };
  state = transition(state, { type: 'CONFIRM_MAP' });
  assert.equal(state.screen, 'chat');
  assert.equal(state.selectedCases.length, 3);
});

test('finishing the third case enters voice preparation before shield', () => {
  const selectedCases = selectCases(['games', 'messages', 'device']).map(({ id }) => id);
  const state = transition({
    ...createInitialState(), screen: 'case-feedback', selectedCases,
    caseIndex: 2, lastAnswerCorrect: true,
  }, { type: 'CONTINUE_CASE' });
  assert.equal(state.screen, 'voice-prepare');
});

test('version one progress migrates without losing old fields', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const legacyState = {
    version: 1, screen: 'map', warmupIndex: 0, warmupAnswers: [], warmupFeedback: null,
    selectedPlaces: ['games', 'messages', 'device'], selectedCases: [], caseIndex: 0,
    selectedClues: [], clueHintVisible: false, mapHintVisible: false,
    lastActionId: null, lastAnswerCorrect: null, crystals: ['awareness'],
    shieldSelected: [], shieldHintVisible: false,
  };
  storage.setItem('digital-map-lesson.v1', JSON.stringify({
    ...legacyState,
  }));
  const loaded = loadLesson(storage);
  assert.equal(loaded.version, 2);
  assert.deepEqual(loaded.selectedPlaces, ['games', 'messages', 'device']);
  assert.deepEqual(loaded.chatChoices, []);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `cd digital-map-lesson && node --test tests/state.test.mjs tests/adapters.test.mjs`

Expected: FAIL because the map still enters `expedition-video`, the final case still enters `shield`, and version 2 fields/migration do not exist.

- [ ] **Step 3: Implement the minimal version 2 state and migration**

Use explicit defaults and screen guards:

```js
export function createInitialState() {
  return {
    version: 2,
    screen: 'welcome',
    // existing fields unchanged
    chatNodeId: 'gift',
    chatChoices: [],
    chatResult: null,
    voiceMode: null,
    voiceStatus: 'idle',
    voiceTurns: [],
    voiceEvaluation: null,
  };
}
```

`CONFIRM_MAP` must calculate the existing cases but set `screen: 'chat'`. `CONTINUE_CHAT` must use the existing `screenForCase()` result. Finishing case index 2 must set `screen: 'voice-prepare'`. `CONTINUE_VOICE` alone may enter `shield`. Migration merges validated legacy arrays and indices into fresh version 2 defaults; invalid legacy values return a fresh state.

- [ ] **Step 4: Run state and adapter tests and confirm GREEN**

Run: `cd digital-map-lesson && node --test tests/state.test.mjs tests/adapters.test.mjs`

Expected: PASS with all old state assertions plus the new route/migration assertions.

- [ ] **Step 5: Commit the state boundary**

```bash
git add digital-map-lesson/src/lesson-state.js digital-map-lesson/src/storage.js digital-map-lesson/tests/state.test.mjs digital-map-lesson/tests/adapters.test.mjs
git commit -m "feat: add chat and voice lesson states"
```

### Task 2: Deterministic branching chat domain

**Files:**
- Create: `digital-map-lesson/src/chat-scenario.js`
- Create: `digital-map-lesson/tests/chat-scenario.test.mjs`

**Interfaces:**
- Produces: `CHAT_START_ID: string`.
- Produces: `getChatNode(nodeId): ChatNode | null`.
- Produces: `chooseChatReply(nodeId, replyId): { nextNodeId, choice, finished } | null`.
- Produces: `evaluateChatChoices(choices): { signals, protectedData, soughtHelp, summary }`.

- [ ] **Step 1: Write failing branch and feedback tests**

```js
test('safe reply closes the chat and protects all three skills', () => {
  const step = chooseChatReply('school-request', 'stop-and-tell');
  assert.deepEqual(step, {
    nextNodeId: 'blocked',
    choice: { nodeId: 'school-request', replyId: 'stop-and-tell', safety: 'safe' },
    finished: true,
  });
  assert.deepEqual(evaluateChatChoices([step.choice]), {
    signals: true, protectedData: true, soughtHelp: true,
    summary: 'Ты ничего не сообщил, остановил разговор и позвал взрослого.',
  });
});

test('unsafe reply continues to a stronger warning instead of losing', () => {
  const step = chooseChatReply('gift', 'share-city');
  assert.equal(step.nextNodeId, 'school-request');
  assert.equal(step.finished, false);
  assert.equal(step.choice.safety, 'unsafe');
});
```

- [ ] **Step 2: Run the new test and confirm RED**

Run: `cd digital-map-lesson && node --test tests/chat-scenario.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the bounded chat graph**

Create three message nodes (`gift`, `school-request`, `alone-request`) and one terminal node (`blocked`). Each non-terminal node has exactly three replies with `id`, `label`, `safety`, and `nextNodeId`. Validate both IDs before returning a transition; return `null` for forged input. Keep all names, locations, schools, accounts, and schedules fictional and generic.

```js
export function chooseChatReply(nodeId, replyId) {
  const node = getChatNode(nodeId);
  const reply = node?.replies.find(({ id }) => id === replyId);
  if (!reply) return null;
  return {
    nextNodeId: reply.nextNodeId,
    choice: { nodeId, replyId, safety: reply.safety },
    finished: getChatNode(reply.nextNodeId)?.terminal === true,
  };
}
```

- [ ] **Step 4: Run the chat tests and confirm GREEN**

Run: `cd digital-map-lesson && node --test tests/chat-scenario.test.mjs`

Expected: PASS for safe, partial, unsafe, terminal, and invalid-ID cases.

- [ ] **Step 5: Commit the chat domain**

```bash
git add digital-map-lesson/src/chat-scenario.js digital-map-lesson/tests/chat-scenario.test.mjs
git commit -m "feat: add branching safety chat scenario"
```

### Task 3: Chat screens and route integration

**Files:**
- Modify: `digital-map-lesson/src/app.js`
- Modify: `digital-map-lesson/src/styles.css`
- Modify: `digital-map-lesson/tests/e2e.mjs`

**Interfaces:**
- Consumes: `getChatNode()`, `chooseChatReply()`, and `evaluateChatChoices()` from Task 2.
- Consumes: state transitions from Task 1.
- Produces: DOM contracts `[data-screen="chat"]`, `[data-chat-message]`, `[data-chat-reply]`, `[data-screen="chat-result"]`, and `[data-action="CONTINUE_CHAT"]`.

- [ ] **Step 1: Extend E2E with a failing chat journey**

Immediately after `CONFIRM_MAP`, assert the new screen, choose one unsafe reply and then the safe exit, and continue:

```js
assert.equal(await page.locator('[data-screen="chat"]').count(), 1);
await page.locator('[data-chat-reply="share-city"]').click();
assert.equal(await page.locator('[data-chat-message]').count(), 2);
await page.locator('[data-chat-reply="stop-and-tell"]').click();
assert.equal(await page.locator('[data-screen="chat-result"]').count(), 1);
await page.locator('[data-action="CONTINUE_CHAT"]').click();
assert.equal(await page.locator('[data-screen="expedition-video"]').count(), 1);
```

- [ ] **Step 2: Run E2E and confirm RED**

Run the server in one terminal with `cd digital-map-lesson && npm start`, then run `cd digital-map-lesson && node tests/e2e.mjs`.

Expected: FAIL because the chat DOM does not exist.

- [ ] **Step 3: Render and style both chat screens**

Add `renderChat()` and `renderChatResult()` to `app.js`. Escape every scenario string with `escapeHtml`, represent messages as a real ordered list, announce the newest message in a polite `aria-live` region, and expose only preset-reply buttons. Update `lessonStep()` and labels so `chat`/`chat-result` are a distinct stage.

Add focused styles for a narrow message column, avatar, bubbles, three large reply chips, typing reveal that respects `prefers-reduced-motion`, and a three-item result panel. At 390 px, no chat bubble or reply may cause horizontal page overflow.

- [ ] **Step 4: Run unit and E2E tests and confirm GREEN**

Run: `cd digital-map-lesson && npm test && node tests/e2e.mjs`

Expected: all tests PASS, no browser console errors, and the existing expedition begins after chat completion.

- [ ] **Step 5: Commit the chat experience**

```bash
git add digital-map-lesson/src/app.js digital-map-lesson/src/styles.css digital-map-lesson/tests/e2e.mjs
git commit -m "feat: add interactive chat stage"
```

### Task 4: Safe Realtime and evaluation server core

**Files:**
- Create: `digital-map-lesson/server/openai.mjs`
- Create: `digital-map-lesson/server/serve.mjs`
- Create: `digital-map-lesson/tests/server.test.mjs`
- Modify: `digital-map-lesson/package.json`
- Modify: `.gitignore`
- Create: `digital-map-lesson/.env.example`

**Interfaces:**
- Produces: `createOpenAIService({ apiKey, realtimeModel, realtimeVoice, evaluationModel, fetchImpl })`.
- Produces: `service.createRealtimeCall(sdp): Promise<string>` returning answer SDP.
- Produces: `service.evaluateVoice(turns): Promise<VoiceEvaluation>`.
- Produces: `createLessonServer({ rootDir, env, fetchImpl })` for test injection.
- Produces routes: `GET /api/health`, `POST /api/realtime/session`, `POST /api/voice/evaluate`.

- [ ] **Step 1: Write failing server contract tests**

Cover demo health, secret absence, method/content-type rejection, request size, upstream SDP forwarding, upstream error redaction, turn validation, and structured evaluation validation:

```js
test('health never exposes the configured key', async () => {
  const server = await startTestServer({ OPENAI_API_KEY: 'sk-test-secret' });
  const response = await fetch(`${server.url}/api/health`);
  const body = await response.text();
  assert.deepEqual(JSON.parse(body), { ok: true, realtime: 'openai' });
  assert.doesNotMatch(body, /sk-test-secret/);
});

test('realtime session proxies SDP through the unified call endpoint', async () => {
  const upstream = createFetchStub({ status: 201, body: 'answer-sdp' });
  const server = await startTestServer({ OPENAI_API_KEY: 'sk-test-secret' }, upstream);
  const response = await fetch(`${server.url}/api/realtime/session`, {
    method: 'POST', headers: { 'content-type': 'application/sdp' }, body: 'offer-sdp',
  });
  assert.equal(await response.text(), 'answer-sdp');
  assert.equal(upstream.calls[0].url, 'https://api.openai.com/v1/realtime/calls');
});
```

- [ ] **Step 2: Run server tests and confirm RED**

Run: `cd digital-map-lesson && node --test tests/server.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the bounded OpenAI service and server**

For the Realtime call, accept only `application/sdp`, cap the body at 64 KiB, create server-side session JSON, and send `FormData` fields `sdp` and `session` to `/v1/realtime/calls`. The session instructions must contain the fixed fictional scenario, Russian mentor role, four-question limit, one-clarification limit, and prohibition on personal-data requests. Return upstream `Content-Type: application/sdp` only on success.

For evaluation, accept JSON no larger than 32 KiB with 1–12 normalized `{ role: 'user'|'assistant', text: string }` turns and text length at most 500 characters per turn. Call `/v1/responses` with `store: false` and a JSON schema requiring:

```js
{
  signals: { met: true, feedback: 'Ты заметил просьбу о секрете.' },
  safeAction: { met: true, feedback: 'Ты решил не открывать ссылку.' },
  trustedAdult: { met: false, feedback: 'Ещё назови взрослого, которому расскажешь.' },
  summary: 'Два шага щита уже готовы.'
}
```

Validate booleans, known keys, and 1–160 character feedback strings before returning the object. Map failures to `BAD_REQUEST`, `TOO_LARGE`, `REALTIME_UNAVAILABLE`, or `EVALUATION_UNAVAILABLE`; do not forward upstream text.

Update scripts:

```json
{
  "scripts": {
    "start": "node server/serve.mjs",
    "test": "node --test tests/*.test.mjs",
    "test:e2e": "node tests/e2e.mjs"
  }
}
```

Create `.env.example` with non-secret defaults:

```dotenv
OPENAI_API_KEY=
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_REALTIME_VOICE=marin
OPENAI_EVALUATION_MODEL=gpt-5-mini
PORT=4174
```

- [ ] **Step 4: Run server and existing tests and confirm GREEN**

Run: `cd digital-map-lesson && npm test`

Expected: all server and existing tests PASS with injected fetch and no network access.

- [ ] **Step 5: Commit the server boundary**

```bash
git add .gitignore digital-map-lesson/.env.example digital-map-lesson/package.json digital-map-lesson/server digital-map-lesson/tests/server.test.mjs
git commit -m "feat: add safe realtime lesson server"
```

### Task 5: Browser API and WebRTC adapters

**Files:**
- Create: `digital-map-lesson/src/voice-api.js`
- Create: `digital-map-lesson/src/realtime-client.js`
- Create: `digital-map-lesson/tests/realtime-client.test.mjs`
- Modify: `digital-map-lesson/tests/adapters.test.mjs`

**Interfaces:**
- Produces: `createVoiceApi({ fetchImpl, baseUrl })` with `health()`, `createSession(sdp)`, and `evaluate(turns)`.
- Produces: `createRealtimeClient({ RTCPeerConnectionImpl, getUserMedia, AudioImpl, now })`.
- Produces client methods: `connect({ createSession, onStatus, onTurn, onError })`, `setMuted(boolean)`, and `close()`.
- Emits normalized statuses: `connecting`, `mentor-speaking`, `listening`, `evaluating`, `ended`, `error`.

- [ ] **Step 1: Write failing adapter tests**

```js
test('realtime client adds microphone track and sends local SDP', async () => {
  const fake = createFakeRealtimeEnvironment();
  const client = createRealtimeClient(fake.dependencies);
  await client.connect({ createSession: fake.createSession, onStatus: fake.onStatus, onTurn: fake.onTurn });
  assert.equal(fake.peer.addedTracks.length, 1);
  assert.equal(fake.createSession.calls[0], 'offer-sdp');
  assert.equal(fake.peer.remoteDescription.sdp, 'answer-sdp');
});

test('close stops tracks, data channel, audio and peer connection', async () => {
  const fake = createFakeRealtimeEnvironment();
  const client = createRealtimeClient(fake.dependencies);
  await client.connect({ createSession: fake.createSession, onStatus: fake.onStatus, onTurn: fake.onTurn });
  await client.close();
  assert.equal(fake.track.stopped, true);
  assert.equal(fake.channel.closed, true);
  assert.equal(fake.peer.closed, true);
});
```

Also test API handling for demo health, non-SDP responses, validated evaluation JSON, timeout/abort, and safe public errors.

- [ ] **Step 2: Run adapter tests and confirm RED**

Run: `cd digital-map-lesson && node --test tests/adapters.test.mjs tests/realtime-client.test.mjs`

Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement injectable API and WebRTC clients**

The WebRTC adapter must:

1. call `getUserMedia({ audio: true })` only inside `connect()`;
2. attach the microphone track to `RTCPeerConnection`;
3. create an `oai-events` data channel;
4. post the completed local offer SDP through the injected `createSession` callback;
5. attach remote audio to a generated audio element with `autoplay`;
6. normalize transcript events into `{ role, text }` without rendering them;
7. provide idempotent cleanup that stops every local track.

The API adapter must use `AbortController`, encode SDP as `application/sdp`, encode evaluation as JSON, validate response content types, and throw only errors with local codes such as `VOICE_DEMO`, `MIC_DENIED`, `SESSION_FAILED`, and `EVALUATION_FAILED`.

- [ ] **Step 4: Run adapter tests and confirm GREEN**

Run: `cd digital-map-lesson && node --test tests/adapters.test.mjs tests/realtime-client.test.mjs`

Expected: PASS with no real microphone, peer connection, or network.

- [ ] **Step 5: Commit the browser boundaries**

```bash
git add digital-map-lesson/src/voice-api.js digital-map-lesson/src/realtime-client.js digital-map-lesson/tests/adapters.test.mjs digital-map-lesson/tests/realtime-client.test.mjs
git commit -m "feat: add realtime browser adapters"
```

### Task 6: Fixed voice scenario and deterministic fallback evaluation

**Files:**
- Create: `digital-map-lesson/src/voice-scenario.js`
- Create: `digital-map-lesson/tests/voice-scenario.test.mjs`

**Interfaces:**
- Produces: `VOICE_SCENARIO` with title, fictional message, privacy reminder, four questions, and criteria labels.
- Produces: `getDemoMentorTurn(index): { role: 'assistant', text: string } | null`.
- Produces: `getDemoReplyOptions(index): Array<{ id, text }>`.
- Produces: `evaluateDemoVoice(turns): VoiceEvaluation` using the same schema as the server.

- [ ] **Step 1: Write failing scenario and fallback tests**

```js
test('demo replies can satisfy all three evaluation criteria', () => {
  const evaluation = evaluateDemoVoice([
    { role: 'user', text: 'Меня торопят и просят секрет от аккаунта.' },
    { role: 'user', text: 'Не открою ссылку и ничего не отправлю.' },
    { role: 'user', text: 'Покажу сообщение маме или учителю.' },
  ]);
  assert.equal(evaluation.signals.met, true);
  assert.equal(evaluation.safeAction.met, true);
  assert.equal(evaluation.trustedAdult.met, true);
});
```

- [ ] **Step 2: Run the scenario test and confirm RED**

Run: `cd digital-map-lesson && node --test tests/voice-scenario.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement fixed copy and local semantic checks**

Use small normalized keyword groups only for fallback, including variants for pressure/prize/secret/link, refusal/stop/block, and adult/parent/teacher. Always return all three criterion objects and a safe 1–160 character summary. The demo offers fictional preset replies and never exposes free-form personal-data input.

- [ ] **Step 4: Run the scenario test and confirm GREEN**

Run: `cd digital-map-lesson && node --test tests/voice-scenario.test.mjs`

Expected: PASS for full, partial, empty, and unrelated answers.

- [ ] **Step 5: Commit the voice scenario**

```bash
git add digital-map-lesson/src/voice-scenario.js digital-map-lesson/tests/voice-scenario.test.mjs
git commit -m "feat: add bounded voice coaching scenario"
```

### Task 7: Voice preparation, live/demo conversation, and evaluation UI

**Files:**
- Modify: `digital-map-lesson/src/app.js`
- Modify: `digital-map-lesson/src/styles.css`
- Modify: `digital-map-lesson/tests/e2e.mjs`

**Interfaces:**
- Consumes: Task 1 voice transitions, Task 5 adapters, Task 6 scenario/fallback.
- Produces DOM contracts: `[data-screen="voice-prepare"]`, `[data-voice-mode]`, `[data-screen="voice-live"]`, `[data-voice-status]`, `[data-action="TOGGLE_VOICE_MUTE"]`, `[data-action="END_VOICE"]`, `[data-demo-reply]`, and `[data-screen="voice-result"]`.

- [ ] **Step 1: Extend E2E with a failing voice-demo journey**

After completing the third existing case, assert preparation, choose demo mode, answer all fixed turns, and verify evaluation before the shield:

```js
assert.equal(await page.locator('[data-screen="voice-prepare"]').count(), 1);
await page.locator('[data-voice-mode="demo"]').click();
for (const replyId of ['spot-secret', 'refuse-link', 'tell-adult']) {
  await page.locator(`[data-demo-reply="${replyId}"]`).click();
}
assert.equal(await page.locator('[data-screen="voice-result"]').count(), 1);
assert.equal(await page.locator('[data-criterion="met"]').count(), 3);
await page.locator('[data-action="CONTINUE_VOICE"]').click();
assert.equal(await page.locator('[data-screen="shield"]').count(), 1);
```

- [ ] **Step 2: Run E2E and confirm RED**

Run: `cd digital-map-lesson && npm start` in one terminal, then `cd digital-map-lesson && npm run test:e2e`.

Expected: FAIL because voice screens are not rendered.

- [ ] **Step 3: Implement the voice controller and screens**

Keep transient connection objects outside persisted state. `renderVoicePrepare()` shows the fictional message, privacy rule, real-voice button only when health says `openai`, and an always-available demo button. `startLiveVoice()` creates the adapter, writes normalized turns through `ADD_VOICE_TURN`, and shows text statuses. `finishVoice()` first closes microphone/peer resources, then requests evaluation; on failure it uses `evaluateDemoVoice(state.voiceTurns)`.

`renderVoiceLive()` must include the current mentor question as text, elapsed-time indicator, mute/unmute, and end buttons. `renderVoiceResult()` must escape all feedback, show three criteria with text and icon, and offer only `CONTINUE_VOICE`; no numerical school grade appears.

Update progress to seven stages and preserve the 4/4 crystal counter. Style a calm mentor card, visible mic state, optional waveform decoration, 48 px controls, responsive result cards, and reduced motion.

- [ ] **Step 4: Run all tests and confirm GREEN**

Run: `cd digital-map-lesson && npm test && npm run test:e2e`

Expected: PASS; E2E reaches the original shield only after the new voice result and makes no external request in demo mode.

- [ ] **Step 5: Commit the integrated voice experience**

```bash
git add digital-map-lesson/src/app.js digital-map-lesson/src/styles.css digital-map-lesson/tests/e2e.mjs
git commit -m "feat: add realtime voice coaching stage"
```

### Task 8: Documentation, regression verification, and visual QA

**Files:**
- Modify: `digital-map-lesson/README.md`
- Verify: all `digital-map-lesson` files

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: a reproducible demo setup and a documented real-key setup with child-privacy boundary.

- [ ] **Step 1: Add README acceptance checks before editing documentation**

Create a temporary checklist in the work notes, not the repository, requiring the README to contain these literal commands and concepts:

```text
npm start
npm test
npm run test:e2e
OPENAI_API_KEY
demo mode
WebRTC
Zero Data Retention
```

- [ ] **Step 2: Confirm the current README misses the new setup**

Run: `cd digital-map-lesson && rg -n 'OPENAI_API_KEY|WebRTC|Zero Data Retention|test:e2e' README.md`

Expected: at least one required concept is absent.

- [ ] **Step 3: Document operation and privacy precisely**

Explain:

1. `npm start` launches port 4174 and demo mode works with no `.env`;
2. copying `.env.example` to `.env` and setting `OPENAI_API_KEY` enables live mode;
3. the browser never receives the standard key;
4. automated tests stub OpenAI;
5. manual QA uses fictional phrases and verifies connect, remote audio, mute, end, evaluation, and fallback;
6. production use for young children needs the customer's consent/privacy process and applicable Zero Data Retention setup.

- [ ] **Step 4: Run clean verification from current files**

Run:

```bash
cd digital-map-lesson
npm test
npm start
```

With the server running, run in a second terminal:

```bash
cd digital-map-lesson
npm run test:e2e
```

Expected: every unit/server test and E2E assertion passes, no console errors appear, and no external request occurs in demo mode.

- [ ] **Step 5: Perform browser visual and accessibility QA**

At desktop 1280×800 and mobile 390×844, manually inspect welcome, chat, chat result, voice preparation, demo conversation, voice result, shield, and final. Confirm one visible `h1`, keyboard operation, visible focus, readable status text, no page-wide horizontal overflow, and correct 4/4 crystal count. If a defect is found, first add the smallest failing automated assertion, then fix it and rerun Step 4.

- [ ] **Step 6: Inspect secret and persistence boundaries**

Run:

```bash
git grep -n 'sk-' -- ':!docs/superpowers' || true
git status --short
```

Expected: no key-shaped secret in tracked application files; only intended implementation and documentation changes are present.

- [ ] **Step 7: Commit documentation and final polish**

```bash
git add digital-map-lesson/README.md digital-map-lesson
git commit -m "docs: finish digital map voice demo"
```

## Final Acceptance

- The 4174 lesson passes from welcome to final in demo mode with no key.
- The old educational journey is intact, with chat and voice inserted at the approved positions.
- Exactly one task is a text chat and exactly one task is a voice conversation.
- The live path keeps the standard API key server-side and uses OpenAI Realtime over WebRTC.
- The evaluation renderer consumes only validated structured data.
- Microphone, network, API, refresh, and missing-key failures all recover into demo mode or voice preparation without losing earlier progress.
- Desktop and mobile layouts have no horizontal page overflow and all controls remain keyboard accessible.
- The repository contains no `.env`, API key, audio, transcript, or conversation log.
