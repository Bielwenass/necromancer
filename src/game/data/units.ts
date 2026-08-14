import type { DerivedFlagKey, Resources, UnitType } from "../types";

/** Canonical unit order. Squad compositions are keyed by exactly these. */
export const UNIT_TYPES = ["skeleton", "zombie", "wraith"] as const;

/** The `derived` flag that opens each unit type; skeletons start open. */
export const UNIT_UNLOCK_FLAG: Record<UnitType, DerivedFlagKey | null> = {
	skeleton: null,
	zombie: "zombiesUnlocked",
	wraith: "wraithsUnlocked",
};

/**
 * The colour a unit type is drawn in everywhere — squad dots, filter chips,
 * reserve rows and the combat canvas alike. The canvas can't read a CSS
 * variable, so the hex lives here and `ui/theme.ts` re-exports it. Never mirror
 * these into CSS.
 */
export const UNIT_COLORS: Record<UnitType, string> = {
	skeleton: "#e8dcc0",
	zombie: "#95b87a",
	wraith: "#7eb0d6",
};

/**
 * Units that reform after a fight however it went — bound spirit rather than
 * flesh, so they come home at full count from a clear *and* from a wipe.
 */
export const UNDYING_TYPES: ReadonlySet<UnitType> = new Set<UnitType>([
	"wraith",
]);

/**
 * Per-unit workshop tracks. `baseBones` × `growth^level` is the price curve,
 * `base` is the stat at level zero, and `statGrowth` is what a level multiplies
 * it by.
 *
 * Both curves are geometric on purpose. A flat gain against a compounding price
 * makes a stat grow as the *logarithm* of bones spent, which cannot keep pace
 * with a compounding dungeon ladder. Two geometric curves make it a power of
 * bones spent instead, at exponent `ln(statGrowth) / ln(growth)`.
 *
 * Keep `statGrowth` below `growth`, or a track pays for itself and the workshop
 * becomes the only purchase worth making. Speed is deliberately near-flat: it
 * decides engagement rather than attrition, and compounds badly.
 */
export const UNIT_STAT_CONFIG = {
	skeleton: {
		hp: {
			baseBones: 50,
			growth: 1.22,
			statGrowth: 1.07,
			label: "HP",
			base: 40,
		},
		dmg: {
			baseBones: 80,
			growth: 1.25,
			statGrowth: 1.07,
			label: "DMG",
			base: 4,
		},
		speed: {
			baseBones: 200,
			growth: 1.3,
			statGrowth: 1.015,
			label: "Speed",
			base: 1.0,
		},
	},
	zombie: {
		hp: {
			baseBones: 120,
			growth: 1.22,
			statGrowth: 1.075,
			label: "HP",
			base: 96,
		},
		dmg: {
			baseBones: 100,
			growth: 1.25,
			statGrowth: 1.062,
			label: "DMG",
			base: 3,
		},
		speed: {
			baseBones: 300,
			growth: 1.3,
			statGrowth: 1.012,
			label: "Speed",
			base: 0.6,
		},
	},
	wraith: {
		hp: {
			baseBones: 80,
			growth: 1.24,
			statGrowth: 1.06,
			label: "HP",
			base: 24,
		},
		dmg: {
			baseBones: 150,
			growth: 1.25,
			statGrowth: 1.08,
			label: "DMG",
			base: 8,
		},
		speed: {
			baseBones: 400,
			growth: 1.3,
			statGrowth: 1.018,
			label: "Speed",
			base: 1.5,
		},
	},
} as const;

export type StatKey = "hp" | "dmg" | "speed";

/** Per-unit base summoning price, before the owned-count scaling curve. */
export const SUMMON_COSTS: Record<UnitType, Partial<Resources>> = {
	skeleton: { bones: 10 },
	zombie: { bones: 5, corpses: 1 },
	wraith: { bones: 20, souls: 1 },
};

/**
 * Resources exempt from the owned-count scaling — they stay at list price no
 * matter how large the army is. Wraith souls are the only one: souls are a rare
 * drop, so scaling them would gate wraiths on soul income instead of price.
 */
export const UNSCALED_COSTS: Record<UnitType, readonly (keyof Resources)[]> = {
	skeleton: [],
	zombie: [],
	wraith: ["souls"],
};

/** Steepness of the summon price curve, `e^(k·√owned)`. */
export const SUMMON_SCALING_K = 0.5;
