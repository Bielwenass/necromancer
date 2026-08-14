import type { EnemyDef, UnitDerivedStats } from "../game/types";

export type Side = "a" | "b";

export type UnitStats = { hp: number; dmg: number; speed: number };

/**
 * The combat-only half of a unit type's derived stats, as the simulation reads
 * it. Picked off `UnitDerivedStats`, so adding a modifier there is a type error
 * here until the sim handles it. Dungeon enemies never carry mods.
 */
export type UnitMods = Pick<
	UnitDerivedStats,
	| "lifesteal"
	| "regen"
	| "berserk"
	| "revive"
	| "vanguard"
	| "aura"
	| "overwhelm"
	| "executioner"
	| "spectral"
	| "lastStand"
>;

export type SideUnitDef = EnemyDef & { mods?: UnitMods };

export type SideConfig = {
	units: SideUnitDef[];
	spawnArea: { x: number; y: number; w: number; h: number };
};

export type EngineOptions = { width: number; height: number; seed?: number };

export type SimUnit = {
	id: number;
	type: string;
	x: number;
	y: number;
	vx: number;
	vy: number;
	hp: number;
	maxHp: number;
	dmg: number;
	speed: number;
	side: Side;
	/** Null for a unit with no modifier at all: the fast path. */
	mods: UnitMods | null;
	revived: boolean;
	/**
	 * Seconds until this unit may swing again, floored at 0. `finalizeSpawn` seeds
	 * it to a random fraction of one interval so a side doesn't strike in lockstep.
	 */
	swingCooldown: number;
};

export type DeathFlash = { x: number; y: number; t: number; side: Side };

export type CombatEvent =
	| {
			type: "kill";
			side: Side;
			unitType: string;
			x: number;
			y: number;
			t: number;
	  }
	| { type: "battle_end"; winner: Side | "draw"; t: number };
