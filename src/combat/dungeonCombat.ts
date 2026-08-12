import { UNIT_COLORS, UNIT_TYPES } from "../game/data/units";
import type { DungeonDef, GameState, UnitType } from "../game/types";
import type { SideConfig, UnitMods } from "./types";

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

/** The combat modifiers a unit type carries, or null when it carries none. */
export function unitMods(
	derived: GameState["derived"],
	type: UnitType,
): UnitMods | null {
	const d = derived[type];
	const mods: UnitMods = {
		lifesteal: d.lifesteal,
		regen: d.regen,
		berserk: d.berserk,
		revive: d.revive,
		vanguard: d.vanguard,
		aura: d.aura,
		overwhelm: d.overwhelm,
		executioner: d.executioner,
		spectral: d.spectral,
		lastStand: d.lastStand,
	};
	// The overwhelmingly common case is a unit with nothing, and the simulation
	// branches on `mods === null` to skip its modifier work entirely.
	for (const value of Object.values(mods)) {
		if (value !== 0) return mods;
	}
	return null;
}

/**
 * Whether a squad fields all three unit types, which is what the Group Tactics
 * upgrade pays for. Composition is known here, so the bonus needs nothing from
 * the engine.
 */
export function hasAllUnitTypes(
	composition: Record<UnitType, number>,
): boolean {
	return UNIT_TYPES.every((type) => composition[type] > 0);
}

export function buildAttackerConfig(
	composition: Record<UnitType, number>,
	derived: GameState["derived"],
): SideConfig {
	const tactics = hasAllUnitTypes(composition)
		? 1 + derived.groupTacticsBonus
		: 1;

	return {
		units: Object.entries(composition).map(([key, value]) => {
			const type = key as UnitType;
			const stats = effectiveUnitStats(derived, type);
			return {
				name: type,
				amount: value,
				stats: { ...stats, dmg: stats.dmg * tactics },
				color: UNIT_COLORS[type],
				mods: unitMods(derived, type) ?? undefined,
			};
		}),
		spawnArea: ATTACKER_SPAWN,
	};
}

/**
 * The dungeon's side of the fight, shared by the live loop, offline catchup and
 * the benchmark so none of them writes the spawn rectangle out by hand.
 *
 * The enemy debuff affixes are applied here rather than in the engine, which is
 * what keeps them free of any simulation cost — and identical online and off,
 * since both paths build their defenders through this function. The roster is
 * rebuilt rather than passed through: `def.enemies` belongs to the dungeon
 * table and must not be scaled in place.
 */
export function buildDefenderConfig(
	def: DungeonDef,
	derived: GameState["derived"],
): SideConfig {
	const hpMult = 1 - derived.enemyHpPenalty;
	const dmgMult = 1 - derived.enemyDmgPenalty;

	return {
		units: def.enemies.map((enemy) => ({
			...enemy,
			stats: {
				hp: enemy.stats.hp * hpMult,
				dmg: enemy.stats.dmg * dmgMult,
				speed: enemy.stats.speed,
			},
		})),
		spawnArea: DEFENDER_SPAWN,
	};
}
