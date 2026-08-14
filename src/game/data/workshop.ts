import type { GardenPlotId } from "../types";

export const TRAVEL_SPEED_PER_LEVEL = 0.08;

/**
 * Price curves for the two crypt tracks: `baseBones × growth^level`. `squadSize`
 * carries its own gain: a level adds `perLevelBase` units and that step grows by
 * one every `levelsPerStep` levels. See `squadSizeFromLevel`.
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
 * Secondary currencies layered onto the bones curve for the harder units. A
 * corpse line takes a fixed share of it; souls and dust stay linear in `level`,
 * an exponential pricing a scarce drop out entirely.
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
	baseYield: number;
	baseCost: number;
	growth: number;
}

/** Every plot grows bones; scarcer currencies buy a richer one. */
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
