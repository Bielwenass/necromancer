import { type StatKey, UNIT_STAT_CONFIG } from "../data/units";
import {
	CRYPT_CONFIG,
	type CryptKey,
	GARDEN_PLOTS,
	type GardenPlotDef,
} from "../data/workshop";
import type { GardenPlotId, Resources, UnitType } from "../types";

export type { CryptKey, GardenPlotDef, StatKey };
export { CRYPT_CONFIG, GARDEN_PLOTS, UNIT_STAT_CONFIG };

const GARDEN_BY_ID: Record<GardenPlotId, GardenPlotDef> = Object.fromEntries(
	GARDEN_PLOTS.map((p) => [p.id, p]),
) as Record<GardenPlotId, GardenPlotDef>;

/** Skeletons cost bones; zombies add corpses and souls; wraiths drop bones. */
export function unitStatCost(
	unit: UnitType,
	stat: StatKey,
	level: number,
): Partial<Resources> {
	const cfg = UNIT_STAT_CONFIG[unit][stat];
	const totalCost: Partial<Resources> = {};

	for (const [resource, cost] of Object.entries(cfg.upgradeCost)) {
		if (level < cost.fromLevel) continue;

		if (cost.growthType === "exp") {
			totalCost[resource as keyof Resources] = Math.floor(
				cost.base * cost.growth ** level,
			);
		}

		if (cost.growthType === "perLevel") {
			const fromLevel = cost.fromLevel ?? 0;

			totalCost[resource as keyof Resources] =
				Math.floor((level - fromLevel) * cost.growth) + cost.base;
		}
	}

	return totalCost;
}

export function statAtLevel(
	cfg: { base: number; statGrowth: number },
	level: number,
): number {
	return cfg.base * cfg.statGrowth ** level;
}

/**
 * Squad size bought so far. Its gain stays sub-exponential on purpose: a squad's
 * contribution to a fight climbs faster than its head count, at the exponent
 * `balanceCheck` measures, so a geometric gain would swamp everything else.
 */
export function squadSizeFromLevel(level: number): number {
	const { perLevelBase, levelsPerStep } = CRYPT_CONFIG.squadSize;
	let total = 0;
	for (let l = 0; l < level; l++) {
		total += perLevelBase + Math.floor(l / levelsPerStep);
	}
	return total;
}

export function cryptCost(key: CryptKey, level: number): Partial<Resources> {
	const cfg = CRYPT_CONFIG[key];
	return { bones: Math.floor(cfg.baseBones * cfg.growth ** level) };
}

export function gardenCost(
	id: GardenPlotId,
	level: number,
): Partial<Resources> {
	const plot = GARDEN_BY_ID[id];
	return {
		[id]: Math.max(1, Math.floor(plot.baseCost * plot.growth ** level)),
	};
}

export function gardenYield(id: GardenPlotId, level: number): number {
	return GARDEN_BY_ID[id].baseYield * level;
}

export function gardenTotalYield(garden: Record<GardenPlotId, number>): number {
	return GARDEN_PLOTS.reduce((sum, p) => sum + p.baseYield * garden[p.id], 0);
}
