import type { DungeonDef } from "./types";

/**
 * Travel duration in ticks after squad travel-speed upgrades are applied.
 * The single source of truth for travel pacing: the live tick, the offline
 * catchup, and the UI timers all go through this.
 */
export function effectiveTravelTicks(
	def: DungeonDef,
	squadTravelSpeedBonus: number,
): number {
	return def.travelTimeTicks / (1 + squadTravelSpeedBonus);
}
