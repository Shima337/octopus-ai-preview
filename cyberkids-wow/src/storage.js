import { MISSIONS } from './missions.js';

const STORAGE_KEY = 'cybermissions.completed.v1';
const missionIds = new Set(MISSIONS.map((mission) => mission.id));

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id) => missionIds.has(id)))];
  } catch {
    return [];
  }
}

export function saveProgress(ids, storage = globalThis.localStorage) {
  try {
    const safeIds = [...new Set(ids.filter((id) => missionIds.has(id)))];
    storage?.setItem(STORAGE_KEY, JSON.stringify(safeIds));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function resetProgress(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}
