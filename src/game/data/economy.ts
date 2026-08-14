import type { Resources, Units } from "../types";

export const STARTING_RESOURCES: Resources = {
	bones: 100,
	souls: 0,
	dust: 0,
	corpses: 0,
	banners: 0,
};

export const STARTING_UNITS: Units = { skeleton: 10, zombie: 0, wraith: 0 };

export const STARTING_DUNGEON_ID = "paupers-tomb";

/** Initial squad size and count limits. */
export const BASE_MAX_SQUAD_SIZE = 5;
export const BASE_MAX_SQUADS = 1;

export const CORPSE_DROP_CHANCE = 0.2;

/** Steepness of the repeat-clear payout curve, `1 + log₁₀(1 + clears) × k`. */
export const CLEAR_MULT_COEFF = 0.5;

/** Souls dropped when a clear's soul roll hits, before `soulsYieldBonus`. */
export const SOULS_PER_DROP = 1;

/** Bones from one manual dig. */
export const DIG_BONE_YIELD = 1;

/** Banners paid per clear, multiplied by the dungeon's tier. */
export const BANNERS_PER_TIER = 1;

/**
 * Ceilings on the two enemy debuffs and the Ritual pity discount. They stack
 * additively, so without a cap a full debuff build could take a dungeon's
 * defenders or a pity counter to nothing.
 */
export const MAX_ENEMY_PENALTY = 0.8;
export const MAX_PITY_REDUCTION = 0.8;
