import type { EnemyDef, UnitDerivedStats } from "../game/types";

export type Side = "a" | "b";

export type UnitStats = { hp: number; dmg: number; speed: number };

/**
 * The combat-only half of a unit type's derived stats, as the simulation reads
 * it. Picked off `UnitDerivedStats` rather than restated, so adding a modifier
 * there is a type error here until the sim handles it.
 *
 * Dungeon enemies never carry mods — only the player's side does.
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

// A single unit inside the combat simulation
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
	/** Null for any unit with no modifier at all — the fast path. */
	mods: UnitMods | null;
	/** Set once a `revive` mod has brought this unit back. */
	revived: boolean;
	/**
	 * Seconds until this unit may swing again, floored at 0. Seeded to a random
	 * fraction of one interval by `finalizeSpawn` so a side doesn't strike in
	 * lockstep.
	 */
	swingCooldown: number;
};

// Death flash particle
export type DeathFlash = { x: number; y: number; t: number; side: Side };

// Combat events
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
