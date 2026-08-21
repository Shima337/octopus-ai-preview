import { createInitialState } from './lesson-state.js';
import { DISTRICTS, HABITS, SAFETY_RULES, TRUSTED_ADULT_ROLES } from './content.js';

const STORAGE_KEY = 'cyber-expedition-progress-v1';
const DISTRICT_IDS = DISTRICTS.map((district) => district.id);
const DISTRICT_PARTS = new Map(DISTRICTS.map((district) => [district.id, district.partId]));
const SCREENS = new Set([
  'welcome', 'intro-video', 'map', 'mirror-video', 'mirror', 'locks-video', 'locks',
  'traps-video', 'traps', 'messages-video', 'chat', 'voice-prepare', 'voice-live', 'voice-result', 'reward', 'safety-card',
]);
const MODES = new Set([null, 'child', 'preview']);
const VOICE_MODES = new Set([null, 'demo', 'realtime']);
const VOICE_STATUSES = new Set(['idle', 'active', 'complete']);
const CARD_RULE_IDS = new Set(SAFETY_RULES.map((rule) => rule.id));
const ADULT_ROLE_IDS = new Set(TRUSTED_ADULT_ROLES.map((role) => role.id));
const HABIT_IDS = new Set(HABITS.map((habit) => habit.id));

export function loadLesson(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    return parsed?.version === 1 ? normalizeState(parsed) : createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveLesson(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
    return true;
  } catch {
    return false;
  }
}

export function resetLesson(storage = globalThis.localStorage) {
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const state = createInitialState();
  state.mode = MODES.has(source.mode) ? source.mode : state.mode;
  state.screen = SCREENS.has(source.screen) ? source.screen : state.screen;
  state.activeDistrict = DISTRICT_IDS.includes(source.activeDistrict) ? source.activeDistrict : null;
  state.voiceMode = VOICE_MODES.has(source.voiceMode) ? source.voiceMode : null;
  state.voiceStatus = VOICE_STATUSES.has(source.voiceStatus) ? source.voiceStatus : state.voiceStatus;
  state.completedDistricts = orderedCompleted(source.completedDistricts);
  state.card = normalizeCard(source.card);

  state.unlockedDistricts = state.mode === 'preview'
    ? [...DISTRICT_IDS]
    : DISTRICT_IDS.slice(0, Math.min(state.completedDistricts.length + 1, DISTRICT_IDS.length));
  state.shieldParts = state.completedDistricts.map((id) => DISTRICT_PARTS.get(id));
  return state;
}

function orderedCompleted(values) {
  const requested = new Set(Array.isArray(values) ? values.filter((id) => DISTRICT_IDS.includes(id)) : []);
  return DISTRICT_IDS.filter((id) => requested.has(id));
}

function normalizeCard(card) {
  const source = card && typeof card === 'object' ? card : {};
  const rules = uniqueAllowed(source.rules, CARD_RULE_IDS).slice(0, 3);
  return {
    rules,
    adultRole: ADULT_ROLE_IDS.has(source.adultRole) ? source.adultRole : null,
    habit: HABIT_IDS.has(source.habit) ? source.habit : null,
  };
}

function uniqueAllowed(values, allowed) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => allowed.has(value)))];
}
