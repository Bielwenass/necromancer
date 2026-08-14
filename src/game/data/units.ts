import type { DerivedFlagKey, Resources, UnitType } from "../types";

export const UNIT_TYPES = ["skeleton", "zombie", "wraith"] as const;

export const UNIT_UNLOCK_FLAG: Record<UnitType, DerivedFlagKey | null> = {
	skeleton: null,
	zombie: "zombiesUnlocked",
	wraith: "wraithsUnlocked",
};

/**
 * The colour a unit type is drawn in everywhere. The combat canvas can't read a
 * CSS variable, so the hex lives here and `ui/theme.ts` re-exports it.
 */
export const UNIT_COLORS: Record<UnitType, string> = {
	skeleton: "#e8dcc0",
	zombie: "#95b87a",
	wraith: "#7eb0d6",
};

/** Units that come home at full count from a clear and from a wipe. */
export const UNDYING_TYPES: ReadonlySet<UnitType> = new Set<UnitType>([
	"wraith",
]);

/**
 * Per-unit workshop tracks: price `baseBones × growth^level`, stat
 * `base × statGrowth^level`. Both geometric, so a stat grows as a power of bones
 * spent and keeps pace with a compounding dungeon ladder. Keep `statGrowth`
 * below `growth`, or the track pays for itself. Speed is near-flat: it decides
 * engagement and compounds badly.
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

export const SUMMON_COSTS: Record<UnitType, Partial<Resources>> = {
	skeleton: { bones: 10 },
	zombie: { bones: 5, corpses: 1 },
	wraith: { bones: 20, souls: 1 },
};

/** Exempt from owned-count scaling; wraith souls, a rare drop, are the only one. */
export const UNSCALED_COSTS: Record<UnitType, readonly (keyof Resources)[]> = {
	skeleton: [],
	zombie: [],
	wraith: ["souls"],
};

/** Steepness of the summon price curve, `e^(k·√owned)`. */
export const SUMMON_SCALING_K = 0.5;
