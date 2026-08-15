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
		growth: 1.17,
		perLevelBase: 1,
		levelsPerStep: 10,
	},
	travelSpeed: { baseBones: 100, growth: 1.35 },
} as const;

export type CryptKey = keyof typeof CRYPT_CONFIG;

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
