import { DISTRICTS, HABITS, SAFETY_RULES, TRUSTED_ADULT_ROLES } from './content.js';

const DISTRICT_IDS = DISTRICTS.map((district) => district.id);
const DISTRICT_PARTS = new Map(DISTRICTS.map((district) => [district.id, district.partId]));
const CARD_RULE_IDS = new Set(SAFETY_RULES.map((rule) => rule.id));
const ADULT_ROLE_IDS = new Set(TRUSTED_ADULT_ROLES.map((role) => role.id));
const HABIT_IDS = new Set(HABITS.map((habit) => habit.id));

const DISTRICT_SCREENS = {
  mirror: { video: 'mirror-video', chapter: 'mirror' },
  locks: { video: 'locks-video', chapter: 'locks' },
  traps: { video: 'traps-video', chapter: 'traps' },
  messages: { video: 'chat', chapter: 'chat' },
};

const PREVIEW_STAGES = {
  home: { screen: 'welcome', activeDistrict: null, completed: [] },
  map: { screen: 'map', activeDistrict: null, completed: [] },
  mirror: { screen: 'mirror-video', activeDistrict: 'mirror', completed: [] },
  locks: { screen: 'locks-video', activeDistrict: 'locks', completed: ['mirror'] },
  traps: { screen: 'traps-video', activeDistrict: 'traps', completed: ['mirror', 'locks'] },
  chat: { screen: 'chat', activeDistrict: 'messages', completed: ['mirror', 'locks', 'traps'] },
  voice: { screen: 'voice-prepare', activeDistrict: 'messages', completed: ['mirror', 'locks', 'traps'] },
  card: { screen: 'safety-card', activeDistrict: null, completed: ['mirror', 'locks', 'traps', 'messages'] },
};

export function createInitialState() {
  return {
    version: 1,
    mode: null,
    screen: 'welcome',
    activeDistrict: null,
    unlockedDistricts: [],
    completedDistricts: [],
    shieldParts: [],
    chapter: {},
    chatChoices: [],
    voiceMode: null,
    voiceStatus: 'idle',
    voiceTurns: [],
    voiceEvaluation: null,
    card: { rules: [], adultRole: null, habit: null },
  };
}

export function stateForPreview(stage) {
  const preview = PREVIEW_STAGES[stage];
  if (!preview) return null;

  const state = createInitialState();
  state.mode = stage === 'home' ? null : 'preview';
  state.screen = preview.screen;
  state.activeDistrict = preview.activeDistrict;
  state.completedDistricts = [...preview.completed];
  state.unlockedDistricts = stage === 'home' ? [] : [...DISTRICT_IDS];
  state.shieldParts = state.completedDistricts.map((id) => DISTRICT_PARTS.get(id));
  if (stage === 'card') {
    state.card = { rules: ['pause', 'secret', 'adult'], adultRole: 'teacher', habit: 'check-photo' };
  }
  return state;
}

export function transition(state, event) {
  if (!state || !event?.type) return state;

  switch (event.type) {
    case 'CHOOSE_MODE':
      if (state.screen !== 'welcome') return state;
      if (event.mode === 'child') return { ...state, mode: 'child', screen: 'intro-video' };
      return event.mode === 'preview' ? stateForPreview('map') : state;

    case 'JUMP_TO_PREVIEW':
      if (state.mode !== 'preview') return state;
      return stateForPreview(event.stage) ?? state;

    case 'SKIP_MEDIA':
      return skipMedia(state);

    case 'OPEN_DISTRICT':
      return openDistrict(state, event.districtId);

    case 'COMPLETE_CHAPTER':
      return completeChapter(state, event.districtId);

    case 'RETURN_TO_MAP':
      return state.screen === 'reward' ? { ...state, screen: 'map', activeDistrict: null } : state;

    case 'OPEN_VOICE':
      return openVoice(state, event.mode);

    case 'COMPLETE_VOICE':
      return state.screen === 'voice-live'
        ? { ...state, screen: 'voice-result', voiceStatus: 'complete', voiceEvaluation: event.evaluation ?? null }
        : state;

    case 'OPEN_CARD':
      return openCard(state);

    case 'UPDATE_CARD':
      return state.screen === 'safety-card'
        ? { ...state, card: normalizeCard(event.card) }
        : state;

    case 'RESTART':
      return createInitialState();

    default:
      return state;
  }
}

function skipMedia(state) {
  if (state.screen === 'intro-video') {
    return { ...state, screen: 'map', unlockedDistricts: ['mirror'] };
  }
  for (const [districtId, screens] of Object.entries(DISTRICT_SCREENS)) {
    if (state.screen === screens.video && districtId !== 'messages') {
      return { ...state, screen: screens.chapter, activeDistrict: districtId };
    }
  }
  return state;
}

function openDistrict(state, districtId) {
  if (state.screen !== 'map' || !state.unlockedDistricts.includes(districtId)) return state;
  const screens = DISTRICT_SCREENS[districtId];
  return screens ? { ...state, screen: screens.video, activeDistrict: districtId } : state;
}

function completeChapter(state, districtId) {
  const screens = DISTRICT_SCREENS[districtId];
  if (!screens || state.screen !== screens.chapter || !state.unlockedDistricts.includes(districtId)) return state;

  const completedDistricts = orderedCompleted([...state.completedDistricts, districtId]);
  return {
    ...state,
    screen: 'reward',
    activeDistrict: districtId,
    completedDistricts,
    ...derivedProgress(completedDistricts),
  };
}

function openVoice(state, mode) {
  if (state.screen === 'chat') return { ...state, screen: 'voice-prepare', activeDistrict: 'messages' };
  if (state.screen !== 'voice-prepare' || !['demo', 'realtime'].includes(mode)) return state;
  return { ...state, screen: 'voice-live', voiceMode: mode, voiceStatus: 'active', voiceTurns: [], voiceEvaluation: null };
}

function openCard(state) {
  if (state.screen !== 'voice-result') return state;
  const completedDistricts = orderedCompleted([...state.completedDistricts, 'messages']);
  return {
    ...state,
    screen: 'safety-card',
    activeDistrict: null,
    completedDistricts,
    ...derivedProgress(completedDistricts),
  };
}

function orderedCompleted(ids) {
  const requested = new Set(ids.filter((id) => DISTRICT_IDS.includes(id)));
  return DISTRICT_IDS.filter((id) => requested.has(id));
}

function derivedProgress(completedDistricts) {
  const completed = orderedCompleted(completedDistricts);
  return {
    unlockedDistricts: DISTRICT_IDS.slice(0, Math.min(completed.length + 1, DISTRICT_IDS.length)),
    shieldParts: completed.map((id) => DISTRICT_PARTS.get(id)),
  };
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
