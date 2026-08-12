import { type StatKey, UNIT_STAT_CONFIG } from "../data/units";
import {
	CRYPT_CONFIG,
	type CryptKey,
	GARDEN_PLOTS,
	type GardenPlotDef,
	UNIT_COST_EXTRAS,
} from "../data/workshop";
import type { GardenPlotId, Resources, UnitType } from "../types";

export type { CryptKey, GardenPlotDef, StatKey };
export { CRYPT_CONFIG, GARDEN_PLOTS, UNIT_STAT_CONFIG };

const GARDEN_BY_ID: Record<GardenPlotId, GardenPlotDef> = Object.fromEntries(
	GARDEN_PLOTS.map((p) => [p.id, p]),
) as Record<GardenPlotId, GardenPlotDef>;

/**
 * Each unit is bought with the currency its nature implies. Skeletons are plain
 * bone-work; zombies need bodies to stitch and, deep in, souls to drive them;
 * wraiths never touch bones at all — they are bound out of flesh, souls, and
 * ground relic dust. The magnitudes are all in `data/workshop.ts`.
 */
export function unitStatCost(
	unit: UnitType,
	stat: StatKey,
	level: number,
): Partial<Resources> {
	const cfg = UNIT_STAT_CONFIG[unit][stat];
	const curve = cfg.baseBones * cfg.growth ** level;

	switch (unit) {
		case "skeleton":
			return { bones: Math.floor(curve) };

		case "zombie": {
			const x = UNIT_COST_EXTRAS.zombie;
			const cost: Partial<Resources> = { bones: Math.floor(curve) };
			if (level >= x.corpsesFromLevel) {
				cost.corpses = Math.max(1, Math.floor(curve * x.corpsesCurveShare));
			}
			if (level >= x.soulsFromLevel) {
				cost.souls = Math.floor(level / x.levelsPerSoul);
			}
			return cost;
		}

		case "wraith": {
			const x = UNIT_COST_EXTRAS.wraith;
			return {
				corpses: Math.max(1, Math.floor(curve * x.corpsesCurveShare)),
				souls: Math.floor(level / x.levelsPerSoul) + 1,
				dust: Math.floor(level / x.levelsPerDust) + 1,
			};
		}
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
