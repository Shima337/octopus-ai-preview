import { getMission } from './missions.js';

export function createInitialState(completed = []) {
  return {
    screen: 'home',
    missionId: null,
    selectedClues: [],
    completed: [...new Set(completed)],
    clueHintVisible: false,
    lastActionId: null,
    lastAnswerCorrect: null,
  };
}

function toggle(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function transition(state, event) {
  const mission = getMission(state.missionId);

  switch (event.type) {
    case 'SELECT_MISSION':
      if (!getMission(event.missionId)) return state;
      return {
        ...state,
        missionId: event.missionId,
        screen: 'intro',
        selectedClues: [],
        clueHintVisible: false,
        lastActionId: null,
        lastAnswerCorrect: null,
      };

    case 'START':
      if (!mission) return state;
      return { ...state, screen: 'clues', selectedClues: [], clueHintVisible: false };

    case 'TOGGLE_CLUE':
      if (state.screen !== 'clues' || !mission) return state;
      if (!mission.trap.clues.some((clue) => clue.id === event.clueId)) return state;
      return {
        ...state,
        selectedClues: toggle(state.selectedClues, event.clueId),
        clueHintVisible: false,
      };

    case 'SUBMIT_CLUES': {
      if (state.screen !== 'clues' || !mission) return state;
      const requiredIds = mission.trap.clues.filter((clue) => clue.correct).map((clue) => clue.id);
      const foundAll = requiredIds.every((id) => state.selectedClues.includes(id));
      return foundAll
        ? { ...state, screen: 'decision', clueHintVisible: false }
        : { ...state, clueHintVisible: true };
    }

    case 'CHOOSE_ACTION': {
      if (state.screen !== 'decision' || !mission) return state;
      const action = mission.decision.actions.find((item) => item.id === event.actionId);
      if (!action) return state;
      return {
        ...state,
        screen: 'feedback',
        lastActionId: action.id,
        lastAnswerCorrect: action.correct,
      };
    }

    case 'RETRY':
      if (state.screen !== 'feedback' || state.lastAnswerCorrect !== false) return state;
      return { ...state, screen: 'decision', lastActionId: null, lastAnswerCorrect: null };

    case 'CONTINUE':
      if (state.screen === 'feedback' && state.lastAnswerCorrect === true && mission) {
        return {
          ...state,
          screen: 'reward',
          completed: [...new Set([...state.completed, mission.id])],
        };
      }
      if (state.screen === 'reward') {
        return { ...createInitialState(state.completed) };
      }
      return state;

    case 'HOME':
      return createInitialState(state.completed);

    default:
      return state;
  }
}
