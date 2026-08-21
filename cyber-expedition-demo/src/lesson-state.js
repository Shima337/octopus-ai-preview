import { DISTRICTS } from './content.js';

const DISTRICT_IDS = DISTRICTS.map((district) => district.id);
const DISTRICT_PARTS = new Map(DISTRICTS.map((district) => [district.id, district.partId]));

const DISTRICT_SCREENS = {
  mirror: { video: 'mirror-video', chapter: 'mirror' },
  locks: { video: 'locks-video', chapter: 'locks' },
  traps: { video: 'traps-video', chapter: 'traps' },
  messages: { video: 'messages-video', chapter: 'chat' },
};

const PREVIEW_STAGES = {
  home: { screen: 'welcome', activeDistrict: null, completed: [] },
  map: { screen: 'map', activeDistrict: null, completed: [] },
  mirror: { screen: 'mirror-video', activeDistrict: 'mirror', completed: [] },
  locks: { screen: 'locks-video', activeDistrict: 'locks', completed: ['mirror'] },
  traps: { screen: 'traps-video', activeDistrict: 'traps', completed: ['mirror', 'locks'] },
  chat: { screen: 'chat', activeDistrict: 'messages', completed: ['mirror', 'locks', 'traps'] },
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
    if (state.screen === screens.video) {
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
