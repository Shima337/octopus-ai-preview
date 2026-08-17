# Digital Map Deep Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained 25–35 minute lesson that turns a child’s selected digital places into personalized safety cases and a final digital-traveller shield.

**Architecture:** A new static application in `digital-map-lesson/` keeps content, pure lesson transitions, video configuration, persistence, and DOM rendering separate. The existing `cyberkids-wow/` application is never modified.

**Tech Stack:** Semantic HTML5, responsive CSS, vanilla JavaScript ES modules, Node.js built-in tests, Playwright library, dependency-free local HTTP server.

## Global Constraints

- Audience: children aged 7–10; short friendly Russian copy with no fear-based language.
- No registration, real brands, live links, names, nicknames, schools, addresses, contacts, external APIs, or runtime assets.
- The complete lesson must work with all five video files absent.
- Only buttons and keyboard-compatible controls; no drag-and-drop, microphone, leaderboard, or comparison between children.
- Wrong answers never remove progress and always allow retry.
- Local storage failure or corrupt data starts a safe fresh lesson.
- Minimum 48px controls, visible keyboard focus, and `prefers-reduced-motion` support.

## File Structure

- `digital-map-lesson/index.html` — document shell and app mount.
- `digital-map-lesson/src/content.js` — six places, six warm-up cards, case bank, shield steps, rules, and video manifest.
- `digital-map-lesson/src/lesson-state.js` — pure lesson state and `transition(state, event)`.
- `digital-map-lesson/src/storage.js` — validated local save/load/reset.
- `digital-map-lesson/src/video.js` — video-slot availability and fallback model.
- `digital-map-lesson/src/app.js` — screen renderers, event delegation, focus, and scroll management.
- `digital-map-lesson/src/styles.css` — visual city, maps, cards, controls, responsive and reduced-motion rules.
- `digital-map-lesson/scripts/serve.mjs` — local server on port 4174.
- `digital-map-lesson/tests/state.test.mjs` — lesson-flow tests.
- `digital-map-lesson/tests/content.test.mjs` — schema and safety checks.
- `digital-map-lesson/tests/adapters.test.mjs` — storage and video fallback checks.
- `digital-map-lesson/tests/e2e.mjs` — complete browser path.
- `digital-map-lesson/package.json` and `digital-map-lesson/README.md` — commands and handoff.

---

### Task 1: Content Model and Lesson State

**Files:**
- Create: `digital-map-lesson/package.json`
- Create: `digital-map-lesson/src/content.js`
- Create: `digital-map-lesson/src/lesson-state.js`
- Create: `digital-map-lesson/tests/state.test.mjs`
- Create: `digital-map-lesson/tests/content.test.mjs`

**Interfaces:**
- Produces: `PLACES`, `WARMUP_CARDS`, `CASES`, `SHIELD_STEPS`, `VIDEOS`, `createInitialState()`, `selectCases(placeIds)`, and `transition(state, event)`.
- Screens: `welcome`, `video-intro`, `warmup`, `warmup-result`, `map`, `expedition-video`, `case-clues`, `case-decision`, `case-feedback`, `shield`, `final-video`, `final`.

- [ ] **Step 1: Write failing flow and content tests**

```js
test('three selected places produce three cases with different risks', () => {
  const cases = selectCases(['games', 'messages', 'device']);
  assert.equal(cases.length, 3);
  assert.equal(new Set(cases.map((item) => item.risk)).size, 3);
});

test('map requires at least three selected places', () => {
  let state = { ...createInitialState(), screen: 'map', selectedPlaces: ['games', 'videos'] };
  state = transition(state, { type: 'CONFIRM_MAP' });
  assert.equal(state.screen, 'map');
  assert.equal(state.mapHintVisible, true);
});
```

- [ ] **Step 2: Run tests and verify missing modules fail**

Run: `cd digital-map-lesson && node --test tests/state.test.mjs tests/content.test.mjs`

Expected: FAIL because content and state modules do not exist.

- [ ] **Step 3: Implement literal content and immutable transitions**

Define place IDs `videos`, `games`, `messages`, `search`, `school`, `device`. Every case includes `placeId`, `risk`, `clues`, three actions, exactly one safe action, supportive feedback, crystal, and rule. `selectCases` must use the selected-place order but prefer unused risks before repeating one.

- [ ] **Step 4: Cover retries, crystals, shield ordering, and restart**

Tests must prove that unsafe decisions go to feedback then return without losing crystals, safe decisions add one unique crystal, five shield steps must be selected in literal order, and `RESTART` returns fresh state.

- [ ] **Step 5: Run unit tests and commit**

Run: `node --test tests/state.test.mjs tests/content.test.mjs`

Expected: all tests PASS.

```bash
git add digital-map-lesson/package.json digital-map-lesson/src/content.js digital-map-lesson/src/lesson-state.js digital-map-lesson/tests
git commit -m "feat: add deep lesson model and state"
```

---

### Task 2: Welcome, Warm-up, and Digital Map UI

**Files:**
- Create: `digital-map-lesson/index.html`
- Create: `digital-map-lesson/src/app.js`
- Create: `digital-map-lesson/src/styles.css`
- Create: `digital-map-lesson/scripts/serve.mjs`
- Create: `digital-map-lesson/tests/e2e.mjs`

**Interfaces:**
- Consumes Task 1 state and content.
- Produces stable markers `data-screen`, `data-video-id`, `data-warmup-answer`, `data-place-id`, and `data-action`.

- [ ] **Step 1: Write a failing browser smoke path**

Open `http://127.0.0.1:4174`, assert the welcome screen, continue through the absent intro video, answer all six warm-up cards, select `games`, `messages`, and `device`, then assert the first personalized case appears.

- [ ] **Step 2: Run the browser path and confirm connection failure**

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: FAIL with connection refused because the new server does not exist.

- [ ] **Step 3: Build the shell, server, shared chrome, and video fallback card**

The video fallback renders its title, goal, duration, status «Видео будет добавлено позже», and button «Продолжить без видео». Server path resolution must reject traversal and default to `127.0.0.1:4174`.

- [ ] **Step 4: Render the warm-up and map**

Warm-up shows one card and three large answer buttons; after every choice it shows a short explanation and a next button. Map shows six selectable districts, a live visual city, and confirmation disabled by state feedback until three places are selected.

- [ ] **Step 5: Run unit and browser checks and commit**

Run: `node --test tests/*.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: all current checks PASS.

```bash
git add digital-map-lesson
git commit -m "feat: build warmup and digital map"
```

---

### Task 3: Personalized Expedition, Shield, Videos, and Persistence

**Files:**
- Create: `digital-map-lesson/src/storage.js`
- Create: `digital-map-lesson/src/video.js`
- Create: `digital-map-lesson/tests/adapters.test.mjs`
- Modify: `digital-map-lesson/src/app.js`
- Modify: `digital-map-lesson/src/styles.css`
- Modify: `digital-map-lesson/tests/e2e.mjs`

**Interfaces:**
- Produces: `loadLesson(storage?)`, `saveLesson(state, storage?)`, `resetLesson(storage?)`, and `getVideoModel(video, availableSources?)`.
- App saves after screen-changing events and restores only validated state version `1`.

- [ ] **Step 1: Write failing adapter and full-flow tests**

Test corrupt JSON fallback, storage exceptions, absent-video fallback, supplied-video player model, one unsafe retry, three safe cases, five ordered shield steps, final rules, reload restoration, and restart.

- [ ] **Step 2: Run tests and verify the new expectations fail**

Run: `node --test tests/adapters.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: FAIL because adapters and later screens do not exist.

- [ ] **Step 3: Implement adapters and remaining renderers**

Render expedition video slots only when their risk matches a case, case clue selection, three decision cards, supportive feedback, four-crystal progress, shield sequence, final video, personalized map, rules, badge, and restart confirmation.

- [ ] **Step 4: Integrate save and recovery**

Persist only JSON-safe state fields. On invalid version, unknown screen, invalid place ID, or storage exception, return `createInitialState()`.

- [ ] **Step 5: Run all checks and commit**

Run: `node --test tests/*.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: all checks PASS.

```bash
git add digital-map-lesson
git commit -m "feat: complete personalized digital lesson"
```

---

### Task 4: Visual Polish, Accessibility, Documentation, and Final Verification

**Files:**
- Create: `digital-map-lesson/README.md`
- Modify: `digital-map-lesson/src/app.js`
- Modify: `digital-map-lesson/src/styles.css`
- Modify: `digital-map-lesson/tests/e2e.mjs`

**Interfaces:**
- Produces the user-facing local lesson on port `4174` and precise video handoff instructions.

- [ ] **Step 1: Add final browser assertions**

Assert one visible heading per screen, non-empty accessible names, zero horizontal overflow at 390×844 and 1280×800, top scroll on screen changes, keyboard activation, no console errors, and no requests outside `127.0.0.1:4174`.

- [ ] **Step 2: Fix every failing visual or accessibility assertion**

Keep programmatic heading focus visually quiet, keyboard control focus visible, controls at least 48px, mobile district cards single-column, and reduced-motion animations under 1ms.

- [ ] **Step 3: Document video replacement and launch**

README must name the five target filenames, recommended MP4/WebM formats, optional VTT subtitles, the manifest fields to change, local command, testing commands, privacy guarantees, and facilitated timing.

- [ ] **Step 4: Run final automated and manual verification**

Run: `node --check src/*.js && node --test tests/*.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Manually inspect welcome, warm-up, map, case, shield, and final at wide and mobile sizes.

- [ ] **Step 5: Commit the verified lesson**

```bash
git add digital-map-lesson
git commit -m "feat: finish digital map deep lesson"
```
