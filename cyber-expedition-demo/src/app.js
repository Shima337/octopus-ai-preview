import { DISTRICTS, SHIELD_PARTS, VIDEOS } from './content.js';
import { transition } from './lesson-state.js';
import { loadLesson, saveLesson } from './storage.js';
import { renderShell } from './ui.js';

const app = document.querySelector('#app');
const content = { districts: DISTRICTS, shieldParts: SHIELD_PARTS, videos: VIDEOS };
let state = loadLesson();

export function eventFromControl(control) {
  const action = control?.dataset.action;
  if (action === 'CHOOSE_CHILD_MODE') return { type: 'CHOOSE_MODE', mode: 'child' };
  if (action === 'CHOOSE_PREVIEW_MODE') return { type: 'CHOOSE_MODE', mode: 'preview' };
  if (action === 'SKIP_MEDIA') return { type: 'SKIP_MEDIA' };
  if (action === 'OPEN_DISTRICT') return { type: 'OPEN_DISTRICT', districtId: control.dataset.districtId };
  if (action === 'JUMP_TO_PREVIEW') return { type: 'JUMP_TO_PREVIEW', stage: control.dataset.previewStage };
  return action ? { type: action } : null;
}

function dispatch(event) {
  if (!event) return;
  state = transition(state, event);
  saveLesson(state);
  render();
}

function render() {
  if (app) app.innerHTML = renderShell(state, content);
}

app?.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control || !app.contains(control)) return;
  dispatch(eventFromControl(control));
});

render();
