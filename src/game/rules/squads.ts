import type { Squad } from "../types";

/** The fields occupancy reads. Kept narrow so callers can pass partial squads. */
type Held = Pick<Squad, "id" | "targetDungeonId" | "state">;

/**
 * Dungeons currently held by a squad. Only one squad may work a dungeon at a
 * time, so players spread out rather than stacking every warband on the tomb
 * that pays best.
 *
 * A squad holds its target from dispatch until it is home and idle again — the
 * return leg included, so a dungeon's cycle is the whole round trip. Keyed off
 * `state` rather than `targetDungeonId`, which is never cleared.
 *
 * `excludeSquadId` drops one squad, for callers asking "could *this* squad go
 * there" about a squad that still holds it.
 */
export function dungeonOccupancy(
	squads: readonly Held[],
	excludeSquadId?: string,
): Set<string> {
	const held = new Set<string>();
	for (const squad of squads) {
		if (squad.state === "idle") continue;
		if (squad.targetDungeonId === null) continue;
		if (squad.id === excludeSquadId) continue;
		held.add(squad.targetDungeonId);
	}
	return held;
}
