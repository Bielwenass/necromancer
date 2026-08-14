import type { GardenPlotId } from "../types";

/** What one crypt level is worth. The UI's label is generated from these. */
export const TRAVEL_SPEED_PER_LEVEL = 0.08;

/**
 * Price curves for the two crypt tracks: `baseBones × growth^level`.
 *
 * `squadSize` also carries its own gain, being the one track whose reward isn't
 * flat: a level adds `perLevelBase` units and that step grows by one every
 * `levelsPerStep` levels — fast enough to reach an endgame muster against a
 * compounding price, slow enough not to outrun every other purchase. See
 * `squadSizeFromLevel` for why it can't simply be geometric.
 */
export const CRYPT_CONFIG = {
	squadSize: {
		baseBones: 90,
		growth: 1.12,
		perLevelBase: 1,
		levelsPerStep: 8,
	},
	travelSpeed: { baseBones: 100, growth: 1.35 },
} as const;

export type CryptKey = keyof typeof CRYPT_CONFIG;

/**
 * Secondary currencies layered onto the bones curve for the harder units. The
 * bones curve (`baseBones × growth^level`) sets the shape of every track, and a
 * unit's corpse line takes a fixed share of it. Souls and dust stay linear in
 * `level` — both are scarce by design, and the exponential would price the unit
 * out entirely.
 */
export const UNIT_COST_EXTRAS = {
	zombie: {
		corpsesFromLevel: 5,
		corpsesCurveShare: 0.1,
		soulsFromLevel: 15,
		levelsPerSoul: 5,
	},
	wraith: {
		corpsesCurveShare: 0.1,
		levelsPerSoul: 3,
		levelsPerDust: 2,
	},
} as const;

export interface GardenPlotDef {
	id: GardenPlotId;
	name: string;
	/** Bones/sec granted per level. */
	baseYield: number;
	/** Cost of level 1 (the unlock); later levels are `baseCost × growth^level`. */
	baseCost: number;
	growth: number;
}

/**
 * Every plot grows bones; they differ in the resource that buys them. Scarcer
 * currencies buy a richer plot, so each resource has somewhere to go.
 */
export const GARDEN_PLOTS: GardenPlotDef[] = [
	{
		id: "bones",
		name: "Ossuary Row",
		baseYield: 0.5,
		baseCost: 600,
		growth: 1.35,
	},
	{
		id: "corpses",
		name: "Carrion Field",
		baseYield: 1,
		baseCost: 80,
		growth: 1.35,
	},
	{ id: "dust", name: "Ash Bed", baseYield: 1.5, baseCost: 5, growth: 1.4 },
	{ id: "souls", name: "Wisp Hollow", baseYield: 2, baseCost: 3, growth: 1.45 },
];
