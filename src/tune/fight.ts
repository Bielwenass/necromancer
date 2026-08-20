import {
	ATTACKER_SPAWN,
	COMBAT_H,
	COMBAT_W,
	DEFENDER_SPAWN,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import type { SideConfig } from "../combat/types";
import { UNIT_STAT_CONFIG, UNIT_TYPES } from "../game/data/units";
import type { UnitType } from "../game/types";
import { UNIT_COLORS } from "../ui/theme";

export type Army = Record<UnitType, number>;

export const EMPTY_ARMY: Army = { skeleton: 0, zombie: 0, wraith: 0 };

export function armyTotal(army: Army): number {
	let total = 0;
	for (const type of UNIT_TYPES) total += army[type];
	return total;
}

/**
 * Level-zero stats straight from the unit table, so the page shows the combat
 * model rather than a particular save's upgrades.
 */
export function buildSide(army: Army, leftSide: boolean): SideConfig {
	return {
		units: UNIT_TYPES.filter((type) => army[type] > 0).map((type) => {
			const stat = UNIT_STAT_CONFIG[type];
			return {
				name: type,
				amount: army[type],
				stats: {
					hp: stat.hp.base,
					dmg: stat.dmg.base,
					speed: stat.speed.base,
				},
				color: UNIT_COLORS[type],
			};
		}),
		spawnArea: leftSide ? ATTACKER_SPAWN : DEFENDER_SPAWN,
	};
}

export function createFight(
	armyA: Army,
	armyB: Army,
	seed: number,
	stats: "off" | "phase" | "detail",
): CombatEngine {
	const engine = new CombatEngine({
		width: COMBAT_W,
		height: COMBAT_H,
		seed,
		stats,
	});
	engine.setSide("a", buildSide(armyA, true));
	engine.setSide("b", buildSide(armyB, false));
	engine.start();
	return engine;
}
