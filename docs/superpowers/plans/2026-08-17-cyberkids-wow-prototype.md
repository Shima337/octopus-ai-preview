# CyberKids Wow Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained browser prototype named «КиберМиссии» with three short digital-safety missions for children aged 7–10.

**Architecture:** A static HTML/CSS/ES-module application renders mission data through one reusable game engine. A pure state module owns transitions and progress, browser adapters own local storage and optional speech, and UI rendering remains separate from mission content.

**Tech Stack:** Semantic HTML5, modern CSS, vanilla JavaScript ES modules, Node.js built-in test runner, Playwright library for end-to-end checks, local Node HTTP server.

## Global Constraints

- Children aged 7–10; short text, simple language, friendly tone, no fear-based copy.
- Button input only; no microphone, free-form AI dialogue, registration, server API, or external runtime assets.
- Never use real links, accounts, personal data, or child images.
- Wrong answers must explain and allow retry without shame.
- Keyboard-visible focus and `prefers-reduced-motion` support are required.
- The application must remain usable when local storage or speech synthesis is unavailable.

## File Structure

- `cyberkids-wow/index.html` — document shell, metadata, mount point, and no-script fallback.
- `cyberkids-wow/src/missions.js` — all three worlds, steps, choices, explanations, theme tokens, and badges.
- `cyberkids-wow/src/game-state.js` — pure initial-state and transition functions.
- `cyberkids-wow/src/storage.js` — guarded local-progress load/save/reset adapter.
- `cyberkids-wow/src/speech.js` — optional browser speech-synthesis adapter.
- `cyberkids-wow/src/app.js` — DOM rendering, event delegation, focus management, and screen flow.
- `cyberkids-wow/src/styles.css` — responsive themes, character art, animations, controls, and accessibility states.
- `cyberkids-wow/scripts/serve.mjs` — dependency-free local static server.
- `cyberkids-wow/tests/game-state.test.mjs` — state and progress unit tests.
- `cyberkids-wow/tests/content.test.mjs` — mission-schema and safety-copy tests.
- `cyberkids-wow/tests/e2e.mjs` — Playwright happy-path and retry-path browser checks.
- `cyberkids-wow/package.json` — scripts only; no application dependencies.
- `cyberkids-wow/README.md` — launch, verification, and demo instructions.

---

### Task 1: Mission Model and Game State

**Files:**
- Create: `cyberkids-wow/src/missions.js`
- Create: `cyberkids-wow/src/game-state.js`
- Create: `cyberkids-wow/tests/game-state.test.mjs`
- Create: `cyberkids-wow/tests/content.test.mjs`
- Create: `cyberkids-wow/package.json`

**Interfaces:**
- Produces: `MISSIONS: Mission[]`, `createInitialState(progress?)`, and `transition(state, event)`.
- `Mission` includes `id`, `title`, `hero`, `theme`, `intro`, `trap`, `decision`, `badge`, and `rule`.
- `transition` accepts events `SELECT_MISSION`, `START`, `TOGGLE_CLUE`, `SUBMIT_CLUES`, `CHOOSE_ACTION`, `RETRY`, `CONTINUE`, and `HOME` and returns a new immutable state.

- [ ] **Step 1: Write failing state tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, transition } from '../src/game-state.js';

test('correct path completes a mission and records its badge', () => {
  let state = createInitialState();
  state = transition(state, { type: 'SELECT_MISSION', missionId: 'cybercat' });
  state = transition(state, { type: 'START' });
  state = transition(state, { type: 'TOGGLE_CLUE', clueId: 'urgency' });
  state = transition(state, { type: 'TOGGLE_CLUE', clueId: 'free-prize' });
  state = transition(state, { type: 'SUBMIT_CLUES' });
  state = transition(state, { type: 'CHOOSE_ACTION', actionId: 'tell-adult' });
  state = transition(state, { type: 'CONTINUE' });
  assert.equal(state.screen, 'reward');
  assert.deepEqual(state.completed, ['cybercat']);
});

test('unsafe action shows feedback and retry returns to decision', () => {
  let state = { ...createInitialState(), screen: 'decision', missionId: 'cybercat' };
  state = transition(state, { type: 'CHOOSE_ACTION', actionId: 'open-link' });
  assert.equal(state.screen, 'feedback');
  assert.equal(state.lastAnswerCorrect, false);
  state = transition(state, { type: 'RETRY' });
  assert.equal(state.screen, 'decision');
});
```

- [ ] **Step 2: Run tests and verify the missing-module failure**

Run: `cd cyberkids-wow && node --test tests/game-state.test.mjs tests/content.test.mjs`

Expected: FAIL because `src/game-state.js` and `src/missions.js` do not exist.

- [ ] **Step 3: Define complete mission data and minimal immutable transitions**

Implement three mission IDs exactly: `cybercat`, `digital-forest`, and `space-patrol`. Require at least two correct clues per mission, mark only the adult-help action as the safest final choice, and use a `Set` internally only if it is copied before mutation.

```js
export function createInitialState(completed = []) {
  return { screen: 'home', missionId: null, selectedClues: [], completed: [...completed], lastAnswerCorrect: null };
}

export function transition(state, event) {
  switch (event.type) {
    case 'SELECT_MISSION': return { ...state, missionId: event.missionId, screen: 'intro' };
    case 'START': return { ...state, screen: 'clues', selectedClues: [] };
    default: return state;
  }
}
```

- [ ] **Step 4: Add schema and safety-copy tests**

Assert three unique mission IDs, three choices per decision, no `http://` or `https://` strings, a non-empty retry explanation for unsafe choices, and the presence of a trusted-adult action in every mission.

- [ ] **Step 5: Run unit tests**

Run: `cd cyberkids-wow && node --test tests/game-state.test.mjs tests/content.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the model**

```bash
git add cyberkids-wow/package.json cyberkids-wow/src/missions.js cyberkids-wow/src/game-state.js cyberkids-wow/tests
git commit -m "feat: add cyber mission model and state"
```

---

### Task 2: Local Shell and Mission Renderer

**Files:**
- Create: `cyberkids-wow/index.html`
- Create: `cyberkids-wow/src/app.js`
- Create: `cyberkids-wow/src/styles.css`
- Create: `cyberkids-wow/scripts/serve.mjs`
- Modify: `cyberkids-wow/package.json`
- Create: `cyberkids-wow/tests/e2e.mjs`

**Interfaces:**
- Consumes: `MISSIONS`, `createInitialState`, and `transition` from Task 1.
- Produces: one `#app` root, buttons with `data-action`, selectable items with `data-clue-id`, and stable screen markers `data-screen="home|intro|clues|decision|feedback|reward"`.

- [ ] **Step 1: Write a failing Playwright smoke check**

```js
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4173');
assert.equal(await page.locator('[data-screen="home"]').count(), 1);
assert.equal(await page.locator('[data-mission-id]').count(), 3);
await browser.close();
```

- [ ] **Step 2: Run server plus smoke check and confirm failure**

Run server: `node scripts/serve.mjs`

Run check: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: FAIL because the shell and server do not exist.

- [ ] **Step 3: Implement the dependency-free static server and HTML shell**

Serve only files resolved inside the project root, map `/` to `index.html`, use correct MIME types, reject traversal with status 403, and listen on `127.0.0.1:4173` unless `PORT` is set.

- [ ] **Step 4: Implement render functions and event delegation**

Create focused renderers `renderHome`, `renderIntro`, `renderClues`, `renderDecision`, `renderFeedback`, and `renderReward`. Route clicks through one listener on `#app`, dispatch state events, then re-render and focus the screen heading.

- [ ] **Step 5: Add the responsive visual system**

Use CSS custom properties per mission, minimum 48px button targets, a 1100px content maximum, a single-column layout below 760px, visible `:focus-visible`, and a reduced-motion media query that disables non-essential animation.

- [ ] **Step 6: Run smoke and unit checks**

Run: `node --test tests/game-state.test.mjs tests/content.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: PASS with three mission cards visible.

- [ ] **Step 7: Commit the shell**

```bash
git add cyberkids-wow/index.html cyberkids-wow/src/app.js cyberkids-wow/src/styles.css cyberkids-wow/scripts cyberkids-wow/tests/e2e.mjs cyberkids-wow/package.json
git commit -m "feat: render cyber mission experience"
```

---

### Task 3: Progress, Retry Feedback, and Optional Narration

**Files:**
- Create: `cyberkids-wow/src/storage.js`
- Create: `cyberkids-wow/src/speech.js`
- Modify: `cyberkids-wow/src/app.js`
- Modify: `cyberkids-wow/src/styles.css`
- Modify: `cyberkids-wow/tests/game-state.test.mjs`
- Modify: `cyberkids-wow/tests/e2e.mjs`

**Interfaces:**
- Produces: `loadProgress(storage?)`, `saveProgress(ids, storage?)`, `resetProgress(storage?)`, `canSpeak(window?)`, `speak(text, window?)`, and `stopSpeaking(window?)`.
- App persistence occurs only when `completed` changes; storage errors are swallowed and return an empty progress list.

- [ ] **Step 1: Add failing tests for persistence-independent state and retry**

Add assertions that `HOME` preserves `completed`, completing a mission twice does not duplicate its ID, and `RETRY` clears only answer feedback while retaining the selected mission.

- [ ] **Step 2: Run unit tests to confirm failures**

Run: `node --test tests/game-state.test.mjs`

Expected: FAIL on deduplication or retry-state assertions.

- [ ] **Step 3: Implement guarded storage and speech adapters**

Use the key `cybermissions.completed.v1`. Validate loaded JSON as an array containing only known mission IDs. Speech must cancel any previous utterance, use `lang = 'ru-RU'`, and return `false` rather than throw when the API is unavailable.

- [ ] **Step 4: Integrate completion marks, reset, retry, and listen buttons**

Show a check mark and badge on completed home cards, a progress counter `N из 3`, a reset button guarded by a child-friendly confirmation panel, and an optional «Послушать» button only when synthesis is supported.

- [ ] **Step 5: Extend the E2E path**

For each mission, click its card, start, select all correct clue buttons, submit, choose the trusted-adult action, continue, assert reward visibility, and return home. Also select one unsafe action, assert supportive feedback, retry, and assert the decision screen returns.

- [ ] **Step 6: Run all automated checks**

Run: `node --test tests/*.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: all unit and browser checks PASS.

- [ ] **Step 7: Commit interactions**

```bash
git add cyberkids-wow/src cyberkids-wow/tests
git commit -m "feat: add progress feedback and narration"
```

---

### Task 4: Polish, Documentation, and Final Verification

**Files:**
- Create: `cyberkids-wow/README.md`
- Modify: `cyberkids-wow/src/styles.css`
- Modify: `cyberkids-wow/src/app.js`
- Modify: `cyberkids-wow/tests/e2e.mjs`

**Interfaces:**
- Consumes all prior modules.
- Produces a documented local demo command and a verified wide/mobile experience.

- [ ] **Step 1: Add final browser assertions**

Assert that every screen has one visible heading, every interactive element has a non-empty accessible name, no horizontal overflow occurs at 390×844 or 1280×800, and keyboard Enter activates a selected mission card.

- [ ] **Step 2: Run the final assertions and capture any failures**

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Expected: either PASS or specific layout/accessibility failures to fix before completion.

- [ ] **Step 3: Apply visual and responsive fixes**

Polish theme-specific background art, character motion, progress transitions, card hover/focus states, supportive feedback panels, and badge reveals without adding external assets or violating reduced motion.

- [ ] **Step 4: Write launch and demo documentation**

Document `node scripts/serve.mjs`, the local URL, unit and E2E verification commands, the three-mission demo path, optional narration behavior, data/privacy guarantees, and static-host deployment compatibility.

- [ ] **Step 5: Run the full verification suite**

Run: `node --test tests/*.test.mjs`

Run: `NODE_PATH=/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/e2e.mjs`

Manually inspect at 1280×800 and 390×844, complete all three missions, test an unsafe answer and retry, test keyboard navigation, and confirm browser console has no errors.

Expected: all automated checks pass and no visual, keyboard, overflow, or console defects remain.

- [ ] **Step 6: Commit the finished prototype**

```bash
git add cyberkids-wow
git commit -m "feat: finish cybermissions wow prototype"
```
