import type { Squad } from "../types";

type Held = Pick<Squad, "id" | "targetDungeonId" | "state">;

/**
 * Dungeons currently held by a squad; only one may work a dungeon at a time. A
 * squad holds its target from dispatch until it is home and idle again, return
 * leg included. Keyed off `state`, since `targetDungeonId` is never cleared.
 *
 * `excludeSquadId` drops one squad, for callers asking whether that squad could
 * go somewhere it already holds.
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
