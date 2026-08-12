import type { UnitType } from "./types";

/** Canonical unit order. Squad compositions are keyed by exactly these. */
export const UNIT_TYPES = ["skeleton", "zombie", "wraith"] as const;

/** How many units a composition holds, across every type. */
export function squadSize(composition: Record<UnitType, number>): number {
	let total = 0;
	for (const type of UNIT_TYPES) total += composition[type];
	return total;
}

/**
 * Units that reform after a fight however it went. A wraith is bound spirit
 * rather than flesh: scattering it costs it nothing it cannot gather back, so
 * it comes home at full count from a clear *and* from a wipe.
 */
const UNDYING_TYPES: ReadonlySet<UnitType> = new Set<UnitType>(["wraith"]);

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

/** What is left of a squad that lost: the undying alone, at full strength. */
export function remnantAfterWipe(
	before: Record<UnitType, number>,
): Record<UnitType, number> {
	return compositionAfterFight(before, {});
}
