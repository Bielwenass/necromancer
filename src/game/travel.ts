import type { DungeonDef, Squad } from "./types";

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

/**
 * Ticks left on a squad's current leg. `position` runs 0→1 outbound and is
 * walked back down 1→0 on the way home, so the two directions read it in
 * opposite senses. Returns null for a squad that is not on the road.
 */
export function squadRemainingTicks(
	squad: Squad,
	travelTicks: number,
): number | null {
	if (squad.state === "traveling")
		return Math.round((1 - squad.position) * travelTicks);
	if (squad.state === "returning")
		return Math.round(squad.position * travelTicks);
	return null;
}
