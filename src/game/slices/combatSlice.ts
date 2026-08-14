import type { CombatEngine } from "../../combat/engine";
import { TICKS_PER_AUTOSAVE } from "../data/pacing";
import { saveGame } from "../save";
import { gameTick } from "../tick";
import type { SliceCreator } from "./types";

export interface CombatSlice {
	/** Live engines keyed by squad id. Runtime-only, never persisted. */
	combatEngines: Map<string, CombatEngine>;
	addCombatEngine: (squadId: string, engine: CombatEngine) => void;
	removeCombatEngine: (squadId: string) => void;
	clearCombatEngines: () => void;
	/**
	 * Advance the simulation by exactly one tick. The driver owns the pacing:
	 * `useGameLifecycle` drains wall-clock time into whole steps, and a second
	 * accumulator here could hand two game ticks to one engine step.
	 */
	tick: () => void;
}

export const createCombatSlice: SliceCreator<CombatSlice> = (set, get) => {
	let saveCounter = 0;

	return {
		combatEngines: new Map<string, CombatEngine>(),

		addCombatEngine: (squadId, engine) => {
			set((prev) => {
				const next = new Map(prev.combatEngines);
				next.set(squadId, engine);
				return { combatEngines: next };
			});
		},

		removeCombatEngine: (squadId) => {
			set((prev) => {
				const next = new Map(prev.combatEngines);
				next.delete(squadId);
				return { combatEngines: next };
			});
		},

		clearCombatEngines: () =>
			set({ combatEngines: new Map<string, CombatEngine>() }),

		tick: () => {
			set((prev) => {
				const next = gameTick(prev);
				// `lastTickAt` is stamped here, outside `gameTick`: it is the wall clock
				// catchup measures against, and the simulation must stay free of it.
				return { ...next, meta: { ...next.meta, lastTickAt: Date.now() } };
			});

			saveCounter++;
			if (saveCounter >= TICKS_PER_AUTOSAVE) {
				saveCounter = 0;
				saveGame(get());
			}
		},
	};
};
