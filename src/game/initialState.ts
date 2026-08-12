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
		},
		meta: { tickCount: 0, dayCount: 0, version: 1, lastTickAt: Date.now() },
	};
}

function buildInitialState(): GameState {
	const base = buildDefaults();
	return { ...base, derived: recomputeDerived(base as GameState) };
}

/** Shapes this version has since replaced, still present in saves on disk. */
type LegacySave = {
	upgrades?: { availablePoints?: number };
};

/**
 * Build the state the store starts from. A save is spread over the defaults, so
 * top-level state fields added since the save was written get their default for
 * free. That does *not* hold inside a nested object — a saved `resources` or
 * `workshop` replaces the default wholesale — so every key added to one of those
 * needs a line here, the way `banners` does below.
 */
export function buildHydratedState(): GameState {
	const saved = loadGame();
	if (!saved) return buildInitialState();

	syncSquadIdCounter(saved.squads ?? []);

	const defaults = buildDefaults();
	// Skill points became the `banners` resource. Carry a pre-change balance
	// across rather than voiding every point the player earned.
	const legacyPoints = (saved as LegacySave).upgrades?.availablePoints;

	const base = {
		...defaults,
		...saved,
		resources: {
			...defaults.resources,
			...saved.resources,
			banners: saved.resources?.banners ?? legacyPoints ?? 0,
		},
		upgrades: { purchased: saved.upgrades?.purchased ?? [] },
		// A save predating the pool rename (`bone` → `banner`, `soul` → `carrion`)
		// carries counters under keys nothing reads. Not worth migrating: the
		// defaults fill the current pools in at zero and the stale keys ride along.
		gacha: {
			...defaults.gacha,
			...saved.gacha,
			pityCounters: {
				...defaults.gacha.pityCounters,
				...saved.gacha?.pityCounters,
			},
		},
		// Saves predating offline catchup have no `lastTickAt`; without one the
		// elapsed-time check reads NaN and catchup never runs.
		meta: { ...saved.meta, lastTickAt: saved.meta?.lastTickAt ?? Date.now() },
	};
	return { ...base, derived: recomputeDerived(base as GameState) };
}
