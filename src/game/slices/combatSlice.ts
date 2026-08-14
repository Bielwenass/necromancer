import type { CombatEngine } from "../../combat/engine";
import { TICK_MS, TICKS_PER_AUTOSAVE } from "../data/pacing";
import { saveGame } from "../save";
import { gameTick } from "../tick";
import type { SliceCreator } from "./types";

export interface CombatSlice {
	/** Live engines keyed by squad id. Runtime-only — never persisted. */
	combatEngines: Map<string, CombatEngine>;
	addCombatEngine: (squadId: string, engine: CombatEngine) => void;
	removeCombatEngine: (squadId: string) => void;
	clearCombatEngines: () => void;
	tick: (deltaMs: number) => void;
}

export const createCombatSlice: SliceCreator<CombatSlice> = (set, get) => {
	let tickAccumulator = 0;
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

		tick: (deltaMs) => {
			tickAccumulator += deltaMs;
			let ticked = false;

			while (tickAccumulator >= TICK_MS) {
				tickAccumulator -= TICK_MS;
				const delta = gameTick(get());
				set((prev) => ({ ...prev, ...delta }));
				ticked = true;
			}

			if (!ticked) return;
			// Stamped here rather than in `gameTick` — it is the wall clock offline
			// catchup measures its window against, so the simulation itself must
			// stay free of it.
			set((prev) => ({ meta: { ...prev.meta, lastTickAt: Date.now() } }));

			saveCounter++;
			if (saveCounter >= TICKS_PER_AUTOSAVE) {
				saveCounter = 0;
				saveGame(get());
			}
		},
	};
};
