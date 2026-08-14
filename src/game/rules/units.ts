import { UNDYING_TYPES, UNIT_TYPES, UNIT_UNLOCK_FLAG } from "../data/units";
import type { GameState, Squad, Units, UnitType } from "../types";

export { UNIT_TYPES };

export function isUnitUnlocked(
	type: UnitType,
	derived: GameState["derived"],
): boolean {
	const flag = UNIT_UNLOCK_FLAG[type];
	return flag === null || derived[flag];
}

export function emptyComposition(): Record<UnitType, number> {
	const comp = {} as Record<UnitType, number>;
	for (const type of UNIT_TYPES) comp[type] = 0;
	return comp;
}

export function squadSize(composition: Record<UnitType, number>): number {
	let total = 0;
	for (const type of UNIT_TYPES) total += composition[type];
	return total;
}

export function isUndying(type: UnitType): boolean {
	return UNDYING_TYPES.has(type);
}

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

export function addComposition(
	a: Record<UnitType, number>,
	b: Record<UnitType, number>,
): Record<UnitType, number> {
	const next = {} as Record<UnitType, number>;
	for (const type of UNIT_TYPES) next[type] = a[type] + b[type];
	return next;
}

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

export function remnantAfterWipe(
	before: Record<UnitType, number>,
): Record<UnitType, number> {
	return compositionAfterFight(before, {});
}
