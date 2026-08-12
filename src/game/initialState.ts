import { DUNGEON_DEFS } from "./data/dungeons";
import {
	STARTING_DUNGEON_ID,
	STARTING_RESOURCES,
	STARTING_UNITS,
} from "./data/economy";
import { recomputeDerived } from "./rules/derived";
import { makeDungeonState } from "./rules/unlocks";
import { loadGame } from "./save";
import { syncSquadIdCounter } from "./slices/squadSlice";
import type { GameState } from "./types";

function buildDefaults(): Omit<GameState, "derived"> {
	return {
		resources: { ...STARTING_RESOURCES },
		workshop: {
			skeleton: { hp: 0, dmg: 0, speed: 0 },
			zombie: { hp: 0, dmg: 0, speed: 0 },
			wraith: { hp: 0, dmg: 0, speed: 0 },
			crypt: { squadSize: 0, travelSpeed: 0 },
			garden: { bones: 0, souls: 0, dust: 0, corpses: 0 },
		},
		units: { ...STARTING_UNITS },
		squads: [],
		dungeons: Object.values(DUNGEON_DEFS).map((def) =>
			makeDungeonState(def, def.id === STARTING_DUNGEON_ID),
		),
		relics: { inventory: [], equipped: {} },
		upgrades: { purchased: [] },
		gacha: {
			pityCounters: { banner: 0, carrion: 0, forbidden: 0 },
			lastPulledRelics: null,
			freePulls: 0,
			freePullTicks: 0,
		},
		meta: { tickCount: 0, dayCount: 0, version: 1, lastTickAt: Date.now() },
	};
}

function buildInitialState(): GameState {
	const base = buildDefaults();
	return { ...base, derived: recomputeDerived(base as GameState) };
}

/**
 * Build the state the store starts from. A save is spread over the defaults, so
 * top-level state fields added since the save was written get their default for
 * free. That does *not* hold inside a nested object — a saved `resources` or
 * `gacha` replaces the default wholesale — so every key added to one of those
 * needs a line here, the way `freePulls` does below.
 *
 * Only saves at the current `SAVE_VERSION` reach this: a bump rejects older ones
 * outright, which is what keeps this free of migration code.
 */
export function buildHydratedState(): GameState {
	const saved = loadGame();
	if (!saved) return buildInitialState();

	syncSquadIdCounter(saved.squads ?? []);

	const defaults = buildDefaults();

	const base = {
		...defaults,
		...saved,
		resources: { ...defaults.resources, ...saved.resources },
		// A squad saved before `roster` existed treats its current strength as the
		// one it was raised at, so replenishing it is a no-op until it loses units.
		squads: (saved.squads ?? []).map((s) => ({
			...s,
			roster: s.roster ?? s.composition,
		})),
		upgrades: { purchased: saved.upgrades?.purchased ?? [] },
		gacha: {
			...defaults.gacha,
			...saved.gacha,
			pityCounters: {
				...defaults.gacha.pityCounters,
				...saved.gacha?.pityCounters,
			},
		},
		// A save written before the tab was hidden has no `lastTickAt`; without one
		// the elapsed-time check reads NaN and catchup never runs.
		meta: { ...saved.meta, lastTickAt: saved.meta?.lastTickAt ?? Date.now() },
	};
	return { ...base, derived: recomputeDerived(base as GameState) };
}
