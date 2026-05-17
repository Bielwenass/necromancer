export type Side = 'a' | 'b';
export type Tier = 'A' | 'B' | 'C';

export type UnitStats = { hp: number; dmg: number; speed: number };

export type SideConfig = {
  composition: Record<string, number>;
  stats: Record<string, UnitStats>;
  color: Record<string, string>;
  spawnArea: { x: number; y: number; w: number; h: number };
};

export type EngineOptions = { width: number; height: number; seed?: number };

// Tier A - individual unit
export type UnitA = {
  id: number; type: string;
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; side: Side;
};

// Death flash particle
export type DeathFlash = { x: number; y: number; t: number; side: Side };

// Combat events
export type CombatEvent =
  | { type: 'kill'; side: Side; unitType: string; x: number; y: number; t: number }
  | { type: 'tier_change'; side: Side; from: Tier; to: Tier; t: number }
  | { type: 'battle_end'; winner: Side | 'draw'; t: number };
