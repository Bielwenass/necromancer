import type { Resources, Units } from "../types";

/** What a fresh necromancer wakes up with. */
export const STARTING_RESOURCES: Resources = {
	bones: 100,
	coins: 0,
	souls: 0,
	dust: 0,
	corpses: 0,
	banners: 0,
};

export const STARTING_UNITS: Units = { skeletons: 10, zombies: 0, wraiths: 0 };

/** The one dungeon open before anything has been cleared. */
export const STARTING_DUNGEON_ID = "paupers-tomb";

/** Squad caps before any upgrade or workshop level is bought. */
export const BASE_MAX_SQUAD_SIZE = 5;
export const BASE_MAX_SQUADS = 1;

/**
 * Chance that a felled enemy leaves a usable body behind. Corpses come off the
 * kill count rather than a loot range, so a dungeon pays them through the size
 * of its roster and the repeat-clear multiplier never touches them.
 */
export const CORPSE_DROP_CHANCE = 0.2;

/**
 * Steepness of the repeat-clear payout curve, `1 + √clears × k`. Square-rooted
 * so farming one dungeon keeps paying without ever running away.
 */
export const CLEAR_MULT_COEFF = 0.07;

/** Souls banked when a clear's soul roll hits, before `soulsYieldBonus`. */
export const SOULS_PER_DROP = 1;

/** Bones from one manual dig. */
export const DIG_BONE_YIELD = 1;

/** Banners paid per clear, multiplied by the dungeon's tier. */
export const BANNERS_PER_TIER = 1;
