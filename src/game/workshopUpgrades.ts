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

export const CRYPT_CONFIG = {
	squadSize: {
		baseBones: 150,
		growth: 1.15,
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

const GARDEN_BY_ID: Record<GardenPlotId, GardenPlotDef> = Object.fromEntries(
	GARDEN_PLOTS.map((p) => [p.id, p]),
) as Record<GardenPlotId, GardenPlotDef>;

export type UnitKey = "skeleton" | "zombie" | "wraith";
export type StatKey = "hp" | "dmg" | "speed";
export type CryptKey = "squadSize" | "travelSpeed";

/**
 * Each unit is bought with the currency its nature implies. Skeletons are plain
 * bone-work; zombies need bodies to stitch and, deep in, souls to drive them;
 * wraiths never touch bones at all — they are bound out of flesh, souls, and
 * ground relic dust.
 *
 * The bones curve (`baseBones × growth^level`) still sets the shape of every
 * track. Wraith corpses take a tenth of it, matching the zombie corpse line,
 * while its souls and dust stay linear in `level` because both are scarce by
 * design (a soul is a per-clear chance roll; dust only comes from sacrificing
 * relics), and putting them on the exponential would price wraiths out.
 */
export function unitStatCost(
	unit: UnitKey,
	stat: StatKey,
	level: number,
): Partial<Resources> {
	const cfg = UNIT_STAT_CONFIG[unit][stat];
	const curve = cfg.baseBones * cfg.growth ** level;

	switch (unit) {
		case "skeleton":
			return { bones: Math.floor(curve) };

		case "zombie": {
			const cost: Partial<Resources> = { bones: Math.floor(curve) };
			if (level >= 5) cost.corpses = Math.max(1, Math.floor(curve * 0.1));
			if (level >= 15) cost.souls = Math.floor(level / 5);
			return cost;
		}

		case "wraith":
			return {
				corpses: Math.max(1, Math.floor(curve * 0.1)),
				souls: Math.floor(level / 3) + 1,
				dust: Math.floor(level / 2) + 1,
			};
	}
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
