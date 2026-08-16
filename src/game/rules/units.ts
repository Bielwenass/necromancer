import { UNDYING_TYPES, UNIT_TYPES, UNIT_UNLOCK_FLAG } from "../data/units";
import type {
	GameState,
	Squad,
	SquadComposition,
	Units,
	UnitType,
} from "../types";

export { UNIT_TYPES };

export function isUnitUnlocked(
	type: UnitType,
	derived: GameState["derived"],
): boolean {
	const flag = UNIT_UNLOCK_FLAG[type];
	return flag === null || derived[flag];
}

export function emptyComposition(): SquadComposition {
	const comp = {} as SquadComposition;
	for (const type of UNIT_TYPES) comp[type] = 0;
	return comp;
}

export function squadSize(composition: SquadComposition): number {
	let total = 0;
	for (const type of UNIT_TYPES) total += composition[type];
	return total;
}

export function isUndying(type: UnitType): boolean {
	return UNDYING_TYPES.has(type);
}

export function compositionAfterFight(
	before: SquadComposition,
	survivors: SquadComposition,
): SquadComposition {
	const next = {} as SquadComposition;
	for (const type of UNIT_TYPES) {
		next[type] = isUndying(type) ? before[type] : (survivors[type] ?? 0);
	}
	return next;
}

export function addComposition(
	a: SquadComposition,
	b: SquadComposition,
): SquadComposition {
	const next = {} as SquadComposition;
	for (const type of UNIT_TYPES) next[type] = a[type] + b[type];
	return next;
}

export function replenishDelta(
	squad: Pick<Squad, "composition" | "roster">,
	units: Units,
	maxSquadSize: number,
): SquadComposition {
	const delta = {} as SquadComposition;
	let room = maxSquadSize - squadSize(squad.composition);
	for (const type of UNIT_TYPES) {
		const short = squad.roster[type] - squad.composition[type];
		const take = Math.max(0, Math.min(short, units[type], room));
		delta[type] = take;
		room -= take;
	}
	return delta;
}

export function remnantAfterWipe(before: SquadComposition): SquadComposition {
	return compositionAfterFight(before, emptyComposition());
}
