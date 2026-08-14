import { UNDYING_TYPES, UNIT_TYPES, UNIT_UNLOCK_FLAG } from "../data/units";
import type { GameState, Squad, Units, UnitType } from "../types";

export { UNIT_TYPES };

/** Whether the tree has opened a unit type. Skeletons need no unlocking. */
export function isUnitUnlocked(
	type: UnitType,
	derived: GameState["derived"],
): boolean {
	const flag = UNIT_UNLOCK_FLAG[type];
	return flag === null || derived[flag];
}

/** An empty composition — every type present at zero. */
export function emptyComposition(): Record<UnitType, number> {
	const comp = {} as Record<UnitType, number>;
	for (const type of UNIT_TYPES) comp[type] = 0;
	return comp;
}

/** How many units a composition holds, across every type. */
export function squadSize(composition: Record<UnitType, number>): number {
	let total = 0;
	for (const type of UNIT_TYPES) total += composition[type];
	return total;
}

export function isUndying(type: UnitType): boolean {
	return UNDYING_TYPES.has(type);
}

/**
 * A squad's composition after a fight: the engine's survivor counts, except for
 * undying types, which are restored to their pre-fight strength.
 *
 * `survivors` is loosely keyed because that is how the combat engine reports
 * it — a missing key means none of that type walked out.
 */
export function compositionAfterFight(
	before: Record<UnitType, number>,
	survivors: Record<string, number>,
): Record<UnitType, number> {
	const next = {} as Record<UnitType, number>;
	for (const type of UNIT_TYPES) {
		next[type] = isUndying(type) ? before[type] : (survivors[type] ?? 0);
	}
	return next;
}

/** Two compositions summed type by type. */
export function addComposition(
	a: Record<UnitType, number>,
	b: Record<UnitType, number>,
): Record<UnitType, number> {
	const next = {} as Record<UnitType, number>;
	for (const type of UNIT_TYPES) next[type] = a[type] + b[type];
	return next;
}

/** What the reserves can give a squad to bring it back to its `roster`. */
export function replenishDelta(
	squad: Pick<Squad, "composition" | "roster">,
	units: Units,
	maxSquadSize: number,
): Record<UnitType, number> {
	const delta = {} as Record<UnitType, number>;
	let room = maxSquadSize - squadSize(squad.composition);
	for (const type of UNIT_TYPES) {
		const short = squad.roster[type] - squad.composition[type];
		const take = Math.max(0, Math.min(short, units[type], room));
		delta[type] = take;
		room -= take;
	}
	return delta;
}

/** What is left of a squad that lost: the undying alone, at full strength. */
export function remnantAfterWipe(
	before: Record<UnitType, number>,
): Record<UnitType, number> {
	return compositionAfterFight(before, {});
}
