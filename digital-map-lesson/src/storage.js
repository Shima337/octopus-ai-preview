import { CASES, PLACES } from './content.js';
import { createInitialState } from './lesson-state.js';

const KEY = 'digital-map-lesson.v1';
const screens = new Set(['welcome', 'video-intro', 'warmup', 'warmup-result', 'map', 'expedition-video', 'case-clues', 'case-decision', 'case-feedback', 'shield', 'final-video', 'final']);
const placeIds = new Set(PLACES.map((item) => item.id));
const caseIds = new Set(CASES.map((item) => item.id));

function validState(value) {
  if (!value || value.version !== 1 || !screens.has(value.screen)) return false;
  if (!Array.isArray(value.selectedPlaces) || value.selectedPlaces.some((id) => !placeIds.has(id))) return false;
  if (!Array.isArray(value.selectedCases) || value.selectedCases.some((id) => !caseIds.has(id))) return false;
  if (!Array.isArray(value.crystals) || !Array.isArray(value.shieldSelected)) return false;
  if (!Number.isInteger(value.warmupIndex) || !Number.isInteger(value.caseIndex)) return false;
  return true;
}

export function loadLesson(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(KEY) ?? 'null');
    return validState(parsed) ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveLesson(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(state));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function resetLesson(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}
