import { SUMMON_COSTS, SUMMON_SCALING_K, UNSCALED_COSTS } from "../data/units";
import type { GameState, Resources, UnitType } from "../types";

/**
 * Price multiplier for the next unit when `owned` already exist: `e^(k·√owned)`.
 * Sub-exponential on purpose: it bites early, then its slope keeps falling, so a
 * large army stays affordable.
 */
export function summonScaling(owned: number): number {
	return Math.exp(SUMMON_SCALING_K * Math.sqrt(Math.max(0, owned)));
}

/**
 * Every unit of `type` the player owns, reserves and squads alike; counting
 * squad-held units stops a new squad walking the price back down the curve.
 */
export function ownedUnitCount(
	type: UnitType,
	state: Pick<GameState, "units" | "squads">,
): number {
	return state.squads.reduce(
		(n, squad) => n + squad.composition[type],
		state.units[type],
	);
}

export type SummonContext = Pick<GameState, "units" | "squads" | "derived">;

/**
 * Cost of summoning `count` more units of `type`, priced one at a time up the
 * scaling curve, so ten single raises and a batch of ten cost the same.
 * `summonCostBonus` discounts skeletons only.
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
