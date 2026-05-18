import type { GameState } from './types';

const SAVE_KEY = 'necromancer_save_v1';
const SAVE_VERSION = 1;

export function saveGame(state: GameState): void {
  try {
    const toSave = {
      resources: state.resources,
      workshop: state.workshop,
      units: state.units,
      squads: state.squads,
      dungeons: state.dungeons,
      relics: state.relics,
      upgrades: state.upgrades,
      surge: state.surge,
      gacha: state.gacha,
      meta: state.meta,
      version: SAVE_VERSION,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export function loadGame(): Omit<GameState, 'derived'> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== SAVE_VERSION) return null;
    return parsed as unknown as Omit<GameState, 'derived'>;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
