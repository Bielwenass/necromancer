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

/**
 * Strike range in px. A reach past the melee scrum lets a type fight from the
 * second rank, which is what keeps wraiths alive behind a line.
 */
export const UNIT_REACH: Record<UnitType, number> = {
	skeleton: 8,
	zombie: 8,
	wraith: 14,
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
			label: "Health",
			base: 40,
			statGrowth: 1.05,
			upgradeCost: {
				bones: { base: 50, growth: 1.22, growthType: "exp" },
			},
		},
		dmg: {
			label: "Damage",
			base: 4,
			statGrowth: 1.05,
			upgradeCost: {
				bones: { base: 80, growth: 1.25, growthType: "exp" },
			},
		},
		speed: {
			label: "Speed",
			base: 1.0,
			statGrowth: 1.015,
			upgradeCost: {
				bones: { base: 200, growth: 1.32, growthType: "exp" },
			},
		},
	},
	zombie: {
		hp: {
			label: "Health",
			base: 96,
			statGrowth: 1.07,
			upgradeCost: {
				bones: { base: 120, growth: 1.22, growthType: "exp" },
				corpses: { fromLevel: 5, base: 7, growth: 1.22, growthType: "exp" },
			},
		},
		dmg: {
			label: "Damage",
			base: 3,
			statGrowth: 1.05,
			upgradeCost: {
				bones: { base: 50, growth: 1.25, growthType: "exp" },
				corpses: { fromLevel: 5, base: 10, growth: 1.25, growthType: "exp" },
			},
		},
		speed: {
			label: "Speed",
			base: 0.6,
			statGrowth: 1.012,
			upgradeCost: {
				bones: { base: 300, growth: 1.3, growthType: "exp" },
				corpses: { fromLevel: 5, base: 15, growth: 1.3, growthType: "exp" },
			},
		},
	},
	wraith: {
		hp: {
			label: "Health",
			base: 24,
			statGrowth: 1.06,
			upgradeCost: {
				souls: { base: 2, growth: 1 / 3, growthType: "perLevel" },
				dust: { fromLevel: 15, base: 1, growth: 1 / 5, growthType: "perLevel" },
			},
		},
		dmg: {
			label: "Damage",
			base: 8,
			statGrowth: 1.08,
			upgradeCost: {
				souls: { base: 2, growth: 1 / 2, growthType: "perLevel" },
				dust: { fromLevel: 10, base: 1, growth: 1 / 4, growthType: "perLevel" },
			},
		},
		speed: {
			label: "Speed",
			base: 1.5,
			statGrowth: 1.018,
			upgradeCost: {
				souls: { base: 3, growth: 1, growthType: "perLevel" },
				dust: { fromLevel: 15, base: 2, growth: 1 / 2, growthType: "perLevel" },
			},
		},
	},
} as const;

export type StatKey = "hp" | "dmg" | "speed";

export const SUMMON_COSTS: Record<UnitType, Partial<Resources>> = {
	skeleton: { bones: 10 },
	zombie: { corpses: 1 },
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
