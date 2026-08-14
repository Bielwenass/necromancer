import type { DungeonDef, Squad } from "../types";

/**
 * Whole ticks one leg costs, after travel-speed upgrades. Rounded up and floored
 * at one, so a leg never ends on the tick it started; every deadline being
 * strictly in the future lets `advance` settle a tick in one pass.
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

export function squadRemainingTicks(
	squad: Squad,
	tickCount: number,
): number | null {
	if (squad.state !== "traveling" && squad.state !== "returning") return null;
	if (squad.phaseEndTick === undefined) return null;
	return Math.max(0, squad.phaseEndTick - tickCount);
}
