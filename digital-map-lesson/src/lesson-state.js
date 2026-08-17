import { CASES, SHIELD_STEPS, WARMUP_CARDS, getCase } from './content.js';

export function createInitialState() {
  return {
    version: 1,
    screen: 'welcome',
    warmupIndex: 0,
    warmupAnswers: [],
    warmupFeedback: null,
    selectedPlaces: [],
    selectedCases: [],
    caseIndex: 0,
    selectedClues: [],
    clueHintVisible: false,
    mapHintVisible: false,
    lastActionId: null,
    lastAnswerCorrect: null,
    crystals: [],
    shieldSelected: [],
    shieldHintVisible: false,
  };
}

export function selectCases(placeIds) {
  const usedRisks = new Set();
  return placeIds.slice(0, 3).map((placeId) => {
    const candidates = CASES.filter((item) => item.placeId === placeId);
    const chosen = candidates.find((item) => !usedRisks.has(item.risk)) ?? candidates[0];
    if (chosen) usedRisks.add(chosen.risk);
    return chosen;
  }).filter(Boolean);
}

function currentCase(state) {
  return getCase(state.selectedCases[state.caseIndex]);
}

function screenForCase(caseItem) {
  return caseItem?.videoId ? 'expedition-video' : 'case-clues';
}

function toggle(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function transition(state, event) {
  switch (event.type) {
    case 'START':
      return { ...state, screen: 'video-intro' };
    case 'SKIP_VIDEO':
      if (state.screen === 'video-intro') return { ...state, screen: 'warmup' };
      if (state.screen === 'expedition-video') return { ...state, screen: 'case-clues' };
      if (state.screen === 'final-video') return { ...state, screen: 'final' };
      return state;
    case 'WARMUP_ANSWER': {
      if (state.screen !== 'warmup' || state.warmupFeedback) return state;
      const card = WARMUP_CARDS[state.warmupIndex];
      if (!card || !['safe', 'danger', 'check'].includes(event.answer)) return state;
      return {
        ...state,
        warmupAnswers: [...state.warmupAnswers, { cardId: card.id, answer: event.answer, correct: card.answer === event.answer }],
        warmupFeedback: { correct: card.answer === event.answer, explanation: card.explanation },
      };
    }
    case 'NEXT_WARMUP':
      if (state.screen !== 'warmup' || !state.warmupFeedback) return state;
      if (state.warmupIndex >= WARMUP_CARDS.length - 1) {
        return { ...state, screen: 'warmup-result', warmupFeedback: null, crystals: [...new Set([...state.crystals, 'awareness'])] };
      }
      return { ...state, warmupIndex: state.warmupIndex + 1, warmupFeedback: null };
    case 'CONTINUE_WARMUP':
      return state.screen === 'warmup-result' ? { ...state, screen: 'map' } : state;
    case 'TOGGLE_PLACE':
      if (state.screen !== 'map') return state;
      return { ...state, selectedPlaces: toggle(state.selectedPlaces, event.placeId), mapHintVisible: false };
    case 'CONFIRM_MAP': {
      if (state.screen !== 'map') return state;
      if (state.selectedPlaces.length < 3) return { ...state, mapHintVisible: true };
      const selectedCases = selectCases(state.selectedPlaces).map((item) => item.id);
      return { ...state, selectedCases, caseIndex: 0, selectedClues: [], screen: screenForCase(getCase(selectedCases[0])) };
    }
    case 'TOGGLE_CASE_CLUE': {
      const caseItem = currentCase(state);
      if (state.screen !== 'case-clues' || !caseItem?.clues.some((item) => item.id === event.clueId)) return state;
      return { ...state, selectedClues: toggle(state.selectedClues, event.clueId), clueHintVisible: false };
    }
    case 'SUBMIT_CASE_CLUES': {
      const caseItem = currentCase(state);
      if (state.screen !== 'case-clues' || !caseItem) return state;
      const correctIds = caseItem.clues.filter((item) => item.correct).map((item) => item.id);
      const foundAll = correctIds.every((id) => state.selectedClues.includes(id));
      return foundAll ? { ...state, screen: 'case-decision', clueHintVisible: false } : { ...state, clueHintVisible: true };
    }
    case 'CHOOSE_CASE_ACTION': {
      const caseItem = currentCase(state);
      if (state.screen !== 'case-decision' || !caseItem) return state;
      const action = caseItem.actions.find((item) => item.id === event.actionId);
      if (!action) return state;
      return { ...state, screen: 'case-feedback', lastActionId: action.id, lastAnswerCorrect: action.correct };
    }
    case 'RETRY_CASE':
      if (state.screen !== 'case-feedback' || state.lastAnswerCorrect !== false) return state;
      return { ...state, screen: 'case-decision', lastActionId: null, lastAnswerCorrect: null };
    case 'CONTINUE_CASE': {
      const caseItem = currentCase(state);
      if (state.screen !== 'case-feedback' || state.lastAnswerCorrect !== true || !caseItem) return state;
      const crystals = [...new Set([...state.crystals, caseItem.risk])];
      const nextIndex = state.caseIndex + 1;
      if (nextIndex >= state.selectedCases.length) {
        return { ...state, crystals, screen: 'shield', selectedClues: [], lastActionId: null, lastAnswerCorrect: null };
      }
      const nextCase = getCase(state.selectedCases[nextIndex]);
      return {
        ...state,
        crystals,
        caseIndex: nextIndex,
        selectedClues: [],
        lastActionId: null,
        lastAnswerCorrect: null,
        screen: screenForCase(nextCase),
      };
    }
    case 'SELECT_SHIELD_STEP': {
      if (state.screen !== 'shield') return state;
      const expected = SHIELD_STEPS[state.shieldSelected.length];
      if (!expected || event.stepId !== expected.id) return { ...state, shieldHintVisible: true };
      const shieldSelected = [...state.shieldSelected, event.stepId];
      return shieldSelected.length === SHIELD_STEPS.length
        ? { ...state, shieldSelected, shieldHintVisible: false, screen: 'final-video' }
        : { ...state, shieldSelected, shieldHintVisible: false };
    }
    case 'RESTART':
      return createInitialState();
    default:
      return state;
  }
}
