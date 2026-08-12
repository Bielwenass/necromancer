import type { EnemyDef } from "../game/types";

export type Side = "a" | "b";

export type UnitStats = { hp: number; dmg: number; speed: number };

export type SideConfig = {
	units: EnemyDef[];
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
