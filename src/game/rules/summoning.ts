import { SUMMON_COSTS, SUMMON_SCALING_K, UNSCALED_COSTS } from "../data/units";
import { UNIT_POOL } from "../slices/helpers";
import type { GameState, Resources, UnitType } from "../types";

/**
 * Price multiplier for the next unit of a type when `owned` of it already
 * exist: `e^(k·√owned)`. Sub-exponential on purpose — it bites early but its
 * slope keeps falling, so a large army stays affordable in a way a true
 * exponential wouldn't allow.
 */
export function summonScaling(owned: number): number {
	return Math.exp(SUMMON_SCALING_K * Math.sqrt(Math.max(0, owned)));
}

/**
 * Every unit of `type` the player owns: the reserve pool plus everything
 * already committed to a squad. Squad-held units are counted so that forming a
 * squad can't be used to walk back down the price curve.
 */
export function ownedUnitCount(
	type: UnitType,
	state: Pick<GameState, "units" | "squads">,
): number {
	return state.squads.reduce(
		(n, squad) => n + squad.composition[type],
		state.units[UNIT_POOL[type]],
	);
}

/** What `summonCost` needs to price a raise. `GameState` satisfies it. */
export type SummonContext = Pick<GameState, "units" | "squads" | "derived">;

/**
 * Cost of summoning `count` more units of `type`, priced one unit at a time up
 * the scaling curve — so ten single raises and one batch of ten cost the same.
 *
 * `derived.summonCostBonus` discounts skeletons only — zombies and wraiths pay
 * list price. Deliberate: the discount comes from the summoning branch, which
 * is skeleton-flavoured.
 */
export function summonCost(
	type: UnitType,
	count: number,
	state: SummonContext,
): Partial<Resources> {
	const base = SUMMON_COSTS[type];
	const discount = type === "skeleton" ? 1 - state.derived.summonCostBonus : 1;
	const owned = ownedUnitCount(type, state);
	const unscaled = UNSCALED_COSTS[type];

	const cost: Partial<Resources> = {};
	for (const [key, amount] of Object.entries(base) as [
		keyof Resources,
		number,
	][]) {
		if (unscaled.includes(key)) {
			cost[key] = Math.round(amount * count * discount);
			continue;
		}
		let total = 0;
		for (let i = 0; i < count; i++) {
			total += Math.round(amount * discount * summonScaling(owned + i));
		}
		cost[key] = total;
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
