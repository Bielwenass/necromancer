import type { CombatEngine } from "../../combat/engine";
import { saveGame } from "../save";
import { gameTick } from "../tick";
import { recomputeDerived } from "../upgrades";
import type { SliceCreator } from "./types";

const TICK_MS = 100;
const TICKS_PER_AUTOSAVE = 50; // 5s

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

				set((prev) => {
					const next = { ...prev, ...delta };
					if (delta.relics || delta.upgrades) {
						next.derived = recomputeDerived(next);
					}
					return next;
				});
				ticked = true;
			}

			if (!ticked) return;
			saveCounter++;
			if (saveCounter >= TICKS_PER_AUTOSAVE) {
				saveCounter = 0;
				saveGame(get());
			}
		},
	};
};
