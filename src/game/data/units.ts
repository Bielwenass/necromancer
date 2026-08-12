import type { Resources, UnitType } from "../types";

/** Canonical unit order. Squad compositions are keyed by exactly these. */
export const UNIT_TYPES = ["skeleton", "zombie", "wraith"] as const;

/**
 * The colour a unit type is drawn in, everywhere it is drawn — squad dots,
 * filter chips, reserve rows, and the combat canvas alike.
 *
 * The combat canvas can't read a CSS variable, so the hex lives here and
 * `ui/theme.ts` re-exports it. Never mirror these into CSS.
 */
export const UNIT_COLORS: Record<UnitType, string> = {
	skeleton: "#e8dcc0",
	zombie: "#95b87a",
	wraith: "#7eb0d6",
};

/**
 * Units that reform after a fight however it went. A wraith is bound spirit
 * rather than flesh: scattering it costs it nothing it cannot gather back, so
 * it comes home at full count from a clear *and* from a wipe.
 */
export const UNDYING_TYPES: ReadonlySet<UnitType> = new Set<UnitType>([
	"wraith",
]);

/**
 * Per-unit workshop tracks. `baseBones` × `growth^level` is the price curve,
 * `perLevel` is what a level adds to the stat, and `base` is the stat at level
 * zero — the flat value combat starts from before any percentage bonus.
 */
export const UNIT_STAT_CONFIG = {
	skeleton: {
		hp: { baseBones: 50, growth: 1.22, perLevel: 2, label: "HP", base: 10 },
		dmg: { baseBones: 80, growth: 1.25, perLevel: 1, label: "DMG", base: 4 },
		speed: {
			baseBones: 200,
			growth: 1.3,
			perLevel: 0.05,
			label: "Speed",
			base: 1.0,
		},
	},
	zombie: {
		hp: { baseBones: 120, growth: 1.22, perLevel: 4, label: "HP", base: 24 },
		dmg: { baseBones: 100, growth: 1.25, perLevel: 0.5, label: "DMG", base: 3 },
		speed: {
			baseBones: 300,
			growth: 1.3,
			perLevel: 0.04,
			label: "Speed",
			base: 0.6,
		},
	},
	wraith: {
		hp: { baseBones: 80, growth: 1.24, perLevel: 1, label: "HP", base: 6 },
		dmg: { baseBones: 150, growth: 1.25, perLevel: 2, label: "DMG", base: 8 },
		speed: {
			baseBones: 400,
			growth: 1.3,
			perLevel: 0.07,
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
