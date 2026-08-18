import { CASES, PLACES } from './content.js';
import { createInitialState } from './lesson-state.js';

const KEY = 'digital-map-lesson.v2';
const LEGACY_KEY = 'digital-map-lesson.v1';
const screens = new Set(['welcome', 'video-intro', 'warmup', 'warmup-result', 'map', 'chat', 'chat-result', 'expedition-video', 'case-clues', 'case-decision', 'case-feedback', 'voice-prepare', 'voice-live', 'voice-result', 'shield', 'final-video', 'final']);
const placeIds = new Set(PLACES.map((item) => item.id));
const caseIds = new Set(CASES.map((item) => item.id));

function validState(value) {
  if (!value || value.version !== 2 || !screens.has(value.screen)) return false;
  if (!Array.isArray(value.selectedPlaces) || value.selectedPlaces.some((id) => !placeIds.has(id))) return false;
  if (!Array.isArray(value.selectedCases) || value.selectedCases.some((id) => !caseIds.has(id))) return false;
  if (!Array.isArray(value.crystals) || !Array.isArray(value.shieldSelected)) return false;
  if (!Array.isArray(value.chatChoices) || !Array.isArray(value.voiceTurns)) return false;
  if (!Number.isInteger(value.warmupIndex) || !Number.isInteger(value.caseIndex)) return false;
  return true;
}

export function migrateState(value) {
  if (!value || value.version !== 1) return null;
  const legacyScreens = new Set(['welcome', 'video-intro', 'warmup', 'warmup-result', 'map', 'expedition-video', 'case-clues', 'case-decision', 'case-feedback', 'shield', 'final-video', 'final']);
  if (!legacyScreens.has(value.screen)) return null;
  if (!Array.isArray(value.selectedPlaces) || value.selectedPlaces.some((id) => !placeIds.has(id))) return null;
  if (!Array.isArray(value.selectedCases) || value.selectedCases.some((id) => !caseIds.has(id))) return null;
  if (!Array.isArray(value.crystals) || !Array.isArray(value.shieldSelected)) return null;
  if (!Number.isInteger(value.warmupIndex) || !Number.isInteger(value.caseIndex)) return null;
  const fresh = createInitialState();
  const migrated = { ...fresh, ...value, version: 2 };
  return validState(migrated) ? migrated : null;
}

export function loadLesson(storage = globalThis.localStorage) {
  try {
    const current = JSON.parse(storage?.getItem(KEY) ?? 'null');
    if (validState(current)) {
      return current.screen === 'voice-live' ? { ...current, screen: 'voice-prepare', voiceStatus: 'idle', voiceTurns: [] } : current;
    }
    const legacy = JSON.parse(storage?.getItem(LEGACY_KEY) ?? 'null');
    return migrateState(legacy) ?? createInitialState();
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
    storage?.removeItem(LEGACY_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}
