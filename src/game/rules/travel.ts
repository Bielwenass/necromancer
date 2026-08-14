import type { DungeonDef, Squad } from "../types";

/**
 * Whole ticks one leg of a trip costs, after squad travel-speed upgrades. The
 * single source of truth for travel pacing: the live tick, the offline catchup
 * and the Crypt timers all go through it.
 *
 * Rounded up and floored at one, so a leg always lands on a tick boundary and
 * never ends on the tick it started — every deadline being strictly in the
 * future is what lets `advance` settle a tick in a single pass.
 */
export function travelLegTicks(
	def: DungeonDef,
	squadTravelSpeedBonus: number,
): number {
	return Math.max(
		1,
		Math.ceil(def.travelTimeTicks / (1 + squadTravelSpeedBonus)),
	);
}

/**
 * Ticks left on a squad's current leg, or null for one that is not on the road.
 * A fighting squad also reads null: its phase ends when the engine calls it.
 */
export function squadRemainingTicks(
	squad: Squad,
	tickCount: number,
): number | null {
	if (squad.state !== "traveling" && squad.state !== "returning") return null;
	if (squad.phaseEndTick === undefined) return null;
	return Math.max(0, squad.phaseEndTick - tickCount);
}
