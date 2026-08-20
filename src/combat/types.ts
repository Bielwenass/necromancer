import type { EnemyDef, UnitDerivedStats } from "../game/types";

export type Side = "a" | "b";

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

export type EngineOptions = {
	width: number;
	height: number;
	seed?: number;
	/** Defaults to `"off"`; the live game pays for no timing at all. */
	stats?: "off" | "phase" | "detail";
};

export const SIDE_A = 0;
export const SIDE_B = 1;

/**
 * Every unit as parallel arrays. Only the first `count` slots are live; a death
 * swaps the last live slot down, so slot order is not spawn order and an index is
 * only valid within one tick.
 */
export type SimUnits = {
	count: number;
	capacity: number;
	id: Int32Array;
	/** Index into `SimState.typeNames`. */
	typeId: Uint8Array;
	/** `SIDE_A` or `SIDE_B`. */
	side: Uint8Array;
	x: Float32Array;
	y: Float32Array;
	vx: Float32Array;
	vy: Float32Array;
	hp: Float32Array;
	maxHp: Float32Array;
	dmg: Float32Array;
	speed: Float32Array;
	/**
	 * Seconds until this unit may swing again, floored at 0. `finalizeSpawn` seeds
	 * it to a random fraction of one interval so a side doesn't strike in lockstep.
	 */
	swingCooldown: Float32Array;
	revived: Uint8Array;
	/** Strike range in px, per unit: a wraith reaches over the line in front. */
	reach: Float32Array;
	/** Id of the enemy this unit is committed to; 0 for none. */
	targetId: Int32Array;
	/** Null for a unit with no modifier at all: the fast path. */
	mods: (UnitMods | null)[];
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
