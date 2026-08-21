/**
 * States the harness drives. A run starts from the literal new-game state and is
 * mutated in place; `sync` folds workshop levels and purchased nodes back into
 * `derived` the way `withDerived` does for the store.
 */

import { DUNGEON_DEFS } from "../../src/game/data/dungeons";
import {
	STARTING_DUNGEON_ID,
	STARTING_RESOURCES,
	STARTING_UNITS,
} from "../../src/game/data/economy";
import { recomputeDerived } from "../../src/game/rules/derived";
import { makeDungeonState } from "../../src/game/rules/unlocks";
import type { GameState } from "../../src/game/types";

export function newRun(): GameState {
	const base: Omit<GameState, "derived"> = {
		resources: { ...STARTING_RESOURCES },
		units: { ...STARTING_UNITS },
		squads: [],
		dungeons: Object.values(DUNGEON_DEFS).map((d) =>
			makeDungeonState(d, d.id === STARTING_DUNGEON_ID),
		),
		relics: { inventory: [], equipped: {} },
		upgrades: { purchased: [], repeats: {} },
		gacha: {
			pityCounters: { banner: 0, carrion: 0, forbidden: 0 },
			lastPulledRelics: null,
			freePulls: 0,
			freePullTicks: 0,
		},
		workshop: {
			skeleton: { hp: 0, dmg: 0, speed: 0 },
			zombie: { hp: 0, dmg: 0, speed: 0 },
			wraith: { hp: 0, dmg: 0, speed: 0 },
			crypt: { squadSize: 0, travelSpeed: 0 },
			garden: { bones: 0, souls: 0, dust: 0, corpses: 0 },
		},
		meta: { tickCount: 0, dayCount: 0, version: 1, lastTickAt: 0 },
	};
	const state = base as GameState;
	sync(state);
	return state;
}

export function sync(state: GameState): void {
	state.derived = recomputeDerived(state);
}

/**
 * The bare unit with its stat line scaled by `statMult`, the probe the power
 * model is measured on. One continuous knob stands in for the workshop grid,
 * whose two tracks grow at the same rate, so a probe can sit at any scale.
 */
export function probeState(statMult: number): GameState {
	const state = newRun();
	state.derived.skeleton.hpFlat *= statMult;
	state.derived.skeleton.dmgFlat *= statMult;
	return state;
}
