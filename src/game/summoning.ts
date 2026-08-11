import type { GameState, Resources, UnitType } from "./types";

/** Per-unit summoning price. Balance numbers live here, not in the store. */
const SUMMON_COSTS: Record<UnitType, Partial<Resources>> = {
	skeleton: { bones: 10 },
	zombie: { bones: 5, corpses: 1 },
	wraith: { bones: 20, souls: 1 },
};

/**
 * `derived.summonCostBonus` discounts skeletons only — zombies and wraiths pay
 * list price. That is deliberate, not an oversight: the discount comes from the
 * summoning branch, which is skeleton-flavoured.
 */
export function summonCost(
	type: UnitType,
	count: number,
	derived: GameState["derived"],
): Partial<Resources> {
	const base = SUMMON_COSTS[type];
	const discount = type === "skeleton" ? 1 - derived.summonCostBonus : 1;
	const cost: Partial<Resources> = {};
	for (const [key, amount] of Object.entries(base) as [
		keyof Resources,
		number,
	][]) {
		cost[key] = Math.round(amount * count * discount);
	}
	return cost;
}

export function isUnitUnlocked(
	type: UnitType,
	derived: GameState["derived"],
): boolean {
	if (type === "zombie") return derived.zombiesUnlocked;
	if (type === "wraith") return derived.wraithsUnlocked;
	return true;
}
