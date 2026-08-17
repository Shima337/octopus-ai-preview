import { SCENARIOS } from './content.js';

export function createInitialState() {
  return {
    version: 1,
    screen: 'welcome',
    scenarioIndex: 0,
    transcript: '',
    attempts: 0,
    currentParts: [],
    missingParts: [],
    completedScenarios: [],
    mode: 'unknown',
    canContinue: false,
    exampleAvailable: false,
  };
}

function uniqueParts(current, next) {
  return ['signal', 'action', 'help'].filter((id) => current.includes(id) || next.includes(id));
}

export function transition(state, event) {
  switch (event.type) {
    case 'START':
      return { ...state, screen: 'privacy' };
    case 'ACCEPT_PRIVACY':
      return { ...state, screen: 'scenario', mode: event.mode ?? state.mode };
    case 'SET_MODE':
      return { ...state, mode: event.mode };
    case 'SET_TRANSCRIPT':
      return { ...state, screen: 'transcript', transcript: String(event.transcript ?? '') };
    case 'CHECK_ANSWER': {
      const attempts = state.attempts + 1;
      const found = event.analysis?.found ?? [];
      return {
        ...state,
        screen: 'feedback',
        attempts,
        currentParts: uniqueParts(state.currentParts, found),
        missingParts: event.analysis?.missing ?? [],
        canContinue: Boolean(event.analysis?.complete),
        exampleAvailable: attempts >= 2,
      };
    }
    case 'RETRY':
      return { ...state, screen: 'scenario' };
    case 'USE_EXAMPLE':
      return {
        ...state,
        screen: 'feedback',
        transcript: String(event.transcript ?? state.transcript),
        currentParts: ['signal', 'action', 'help'],
        missingParts: [],
        canContinue: true,
      };
    case 'CONTINUE': {
      if (!state.canContinue) return state;
      const scenario = SCENARIOS[state.scenarioIndex];
      const completedScenarios = scenario && !state.completedScenarios.includes(scenario.id)
        ? [...state.completedScenarios, scenario.id]
        : state.completedScenarios;
      const nextIndex = state.scenarioIndex + 1;
      if (nextIndex >= SCENARIOS.length) return { ...state, screen: 'final', completedScenarios };
      return {
        ...state,
        screen: 'scenario',
        scenarioIndex: nextIndex,
        transcript: '',
        attempts: 0,
        currentParts: [],
        missingParts: [],
        completedScenarios,
        canContinue: false,
        exampleAvailable: false,
      };
    }
    case 'RESTART':
      return createInitialState();
    default:
      return state;
  }
}
