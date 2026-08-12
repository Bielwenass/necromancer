import { recomputeDerived } from "../rules/derived";
import type { GameState, SlotId, Units, UnitType } from "../types";

/**
 * Apply a patch and refresh `derived` from the result in one step.
 *
 * `derived` is a projection of upgrades + workshop + equipped relics, and
 * nothing recomputes it on a timer — every action that touches those inputs
 * must refresh it explicitly, which is what this exists to guarantee.
 */
export function withDerived(
	prev: GameState,
	patch: Partial<GameState>,
): Partial<GameState> {
	return { ...patch, derived: recomputeDerived({ ...prev, ...patch }) };
}

/** Squad compositions are singular-keyed, the reserve pool is plural-keyed. */
export const UNIT_POOL: Record<UnitType, keyof Units> = {
	skeleton: "skeletons",
	zombie: "zombies",
	wraith: "wraiths",
};

/**
 * Move units between the reserve pool and a squad. `sign` is -1 to spend units
 * on a squad, +1 to return them. Exists because `Units` is plural-keyed
 * (`skeletons`) while squad compositions are singular-keyed (`skeleton`).
 */
export function applyUnitDelta(
	units: Units,
	counts: Partial<Record<UnitType, number>>,
	sign: 1 | -1,
): Units {
	const next = { ...units };
	for (const type of Object.keys(UNIT_POOL) as UnitType[]) {
		next[UNIT_POOL[type]] += sign * (counts[type] ?? 0);
	}
	return next;
}

/** True when the reserve pool can cover every unit in `counts`. */
export function hasUnitsAvailable(
	units: Units,
	counts: Partial<Record<UnitType, number>>,
): boolean {
	return (Object.keys(UNIT_POOL) as UnitType[]).every(
		(type) => (counts[type] ?? 0) <= units[UNIT_POOL[type]],
	);
}

/** Drop a relic from every slot it occupies. Used on both equip and sacrifice. */
export function withoutRelic(
	equipped: GameState["relics"]["equipped"],
	relicId: string,
): GameState["relics"]["equipped"] {
	const next = { ...equipped };
	for (const [slot, id] of Object.entries(next)) {
		if (id === relicId) delete next[slot as SlotId];
	}
	return next;
}
