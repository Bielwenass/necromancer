import { UNIT_COLORS } from "../game/data/units";
import type { DungeonDef, GameState, UnitType } from "../game/types";
import type { SideConfig } from "./types";

export const COMBAT_W = 360;
export const COMBAT_H = 180;

/** Where each side musters, as mirrored bands at the edges of the arena. */
export const ATTACKER_SPAWN = { x: 10, y: 10, w: 55, h: COMBAT_H - 20 };
export const DEFENDER_SPAWN = {
	x: COMBAT_W - 65,
	y: 10,
	w: 55,
	h: COMBAT_H - 20,
};

/**
 * A unit type's stats as combat actually uses them: the flat value from the
 * workshop, raised by the percentage bonuses from upgrades and relics.
 *
 * The single source of truth for what a unit is worth in a fight. The
 * Reliquary's stat panel reads it too, so the panel and the engine can't
 * disagree by a point of rounding.
 */
export function effectiveUnitStats(
	derived: GameState["derived"],
	type: UnitType,
): { hp: number; dmg: number; speed: number } {
	const d = derived[type];
	return {
		hp: d.hpFlat * (1 + d.hpBonus),
		dmg: d.dmgFlat * (1 + d.dmgBonus),
		speed: d.speedFlat * (1 + d.speedBonus),
	};
}

export function buildAttackerConfig(
	composition: Record<UnitType, number>,
	derived: GameState["derived"],
): SideConfig {
	return {
		units: Object.entries(composition).map(([key, value]) => {
			const type = key as UnitType;
			return {
				name: type,
				amount: value,
				stats: effectiveUnitStats(derived, type),
				color: UNIT_COLORS[type],
			};
		}),
		spawnArea: ATTACKER_SPAWN,
	};
}

/**
 * The dungeon's side of the fight, shared by the live loop, offline catchup and
 * the benchmark so none of them writes the spawn rectangle out by hand.
 */
export function buildDefenderConfig(def: DungeonDef): SideConfig {
	return { units: def.enemies, spawnArea: DEFENDER_SPAWN };
}
