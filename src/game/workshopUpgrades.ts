import type { GardenPlotId, Resources } from "./types";

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
		dmg: { baseBones: 100, growth: 1.25, perLevel: 1, label: "DMG", base: 3 },
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

export const CRYPT_CONFIG = {
	squadSize: {
		baseBones: 150,
		growth: 1.25,
		label: "+1 max squad size per level",
	},
	travelSpeed: {
		baseBones: 100,
		growth: 1.35,
		label: "+8% travel & return speed per level",
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
		baseYield: 1,
		baseCost: 600,
		growth: 1.35,
	},
	{
		id: "coins",
		name: "Pauper Trench",
		baseYield: 1.5,
		baseCost: 200,
		growth: 1.35,
	},
	{ id: "souls", name: "Wisp Hollow", baseYield: 4, baseCost: 3, growth: 1.45 },
	{ id: "dust", name: "Ash Bed", baseYield: 3, baseCost: 5, growth: 1.4 },
	{
		id: "corpses",
		name: "Carrion Field",
		baseYield: 2,
		baseCost: 80,
		growth: 1.35,
	},
];

const GARDEN_BY_ID: Record<GardenPlotId, GardenPlotDef> = Object.fromEntries(
	GARDEN_PLOTS.map((p) => [p.id, p]),
) as Record<GardenPlotId, GardenPlotDef>;

export type UnitKey = "skeleton" | "zombie" | "wraith";
export type StatKey = "hp" | "dmg" | "speed";
export type CryptKey = "squadSize" | "travelSpeed";

export function unitStatCost(
	unit: UnitKey,
	stat: StatKey,
	level: number,
): Partial<Resources> {
	const cfg = UNIT_STAT_CONFIG[unit][stat];
	const bones = Math.floor(cfg.baseBones * cfg.growth ** level);
	const cost: Partial<Resources> = { bones };
	if (level >= 5) cost.corpses = Math.max(1, Math.floor(bones * 0.1));
	if (level >= 15) cost.souls = Math.floor(level / 5);
	if (unit === "wraith" && level >= 3) {
		cost.souls = Math.max(cost.souls ?? 0, Math.floor(level / 3));
	}
	return cost;
}

export function cryptCost(key: CryptKey, level: number): Partial<Resources> {
	const cfg = CRYPT_CONFIG[key];
	return { bones: Math.floor(cfg.baseBones * cfg.growth ** level) };
}

/** A plot is bought and upgraded with the resource it is named for. */
export function gardenCost(
	id: GardenPlotId,
	level: number,
): Partial<Resources> {
	const plot = GARDEN_BY_ID[id];
	return {
		[id]: Math.max(1, Math.floor(plot.baseCost * plot.growth ** level)),
	};
}

/** Bones/sec a plot produces at `level`. */
export function gardenYield(id: GardenPlotId, level: number): number {
	return GARDEN_BY_ID[id].baseYield * level;
}

/** Total bones/sec across every plot, before `bonesPassiveMult`. */
export function gardenTotalYield(garden: Record<GardenPlotId, number>): number {
	return GARDEN_PLOTS.reduce((sum, p) => sum + p.baseYield * garden[p.id], 0);
}
