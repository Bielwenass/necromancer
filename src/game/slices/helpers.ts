import { UNIT_TYPES } from "../data/units";
import { recomputeDerived } from "../rules/derived";
import type { GameState, SlotId, Units, UnitType } from "../types";

/**
 * Apply a patch and refresh `derived` from the result in one step. Nothing
 * recomputes `derived` on a timer, so every action touching upgrades, workshop
 * levels or equipped relics must go through this.
 */
export function withDerived(
	prev: GameState,
	patch: Partial<GameState>,
): Partial<GameState> {
	return { ...patch, derived: recomputeDerived({ ...prev, ...patch }) };
}

/**
 * Move units between the reserve pool and a squad. `sign` is -1 to spend units
 * on a squad, +1 to return them.
 */
export function applyUnitDelta(
	units: Units,
	counts: Partial<Record<UnitType, number>>,
	sign: 1 | -1,
): Units {
	const next = { ...units };
	for (const type of UNIT_TYPES) next[type] += sign * (counts[type] ?? 0);
	return next;
}

/** True when the reserve pool can cover every unit in `counts`. */
export function hasUnitsAvailable(
	units: Units,
	counts: Partial<Record<UnitType, number>>,
): boolean {
	return UNIT_TYPES.every((type) => (counts[type] ?? 0) <= units[type]);
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
