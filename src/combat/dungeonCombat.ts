import type { SideConfig } from './types';
import { CombatEngine } from './engine';

export const COMBAT_W = 360;
export const COMBAT_H = 180;

export type EnemyDef = {
  composition: Record<string, number>;
  stats: Record<string, { hp: number; dmg: number; speed: number }>;
  color: Record<string, string>;
};

// Per-dungeon enemy forces. Each unit type's hp/dmg/speed are tuned so that the
// simulation produces appropriately difficult fights for the squads a player can
// assemble at that stage of the game.
export const DUNGEON_ENEMY_DEFS: Record<string, EnemyDef> = {
  'paupers-tomb': {
    // Freshly-turned grave scraps — many and slow, beatable by 10 skeletons.
    composition: { graveling: 8, shuffler: 4 },
    stats: {
      graveling: { hp: 8,  dmg: 4, speed: 0.7 },
      shuffler:  { hp: 12, dmg: 6, speed: 0.5 },
    },
    color: {
      graveling: '#6B5040',
      shuffler:  '#8B6848',
    },
  },

  'wolf-den': {
    // Pack hunters — fast, punish lone skeletons. Needs 15+ or a zombie meatshield.
    composition: { wolf: 12, alpha: 3 },
    stats: {
      wolf:  { hp: 10, dmg: 8,  speed: 1.6 },
      alpha: { hp: 20, dmg: 12, speed: 1.2 },
    },
    color: {
      wolf:  '#A07850',
      alpha: '#603820',
    },
  },

  'abandoned-chapel': {
    // Glass-cannon cultists backed by slow bruiser revenants. Wraithless squads
    // can stall on the revenant's HP pool.
    composition: { cultist: 10, revenant: 4 },
    stats: {
      cultist:  { hp: 6,  dmg: 7, speed: 1.0 },
      revenant: { hp: 18, dmg: 9, speed: 0.7 },
    },
    color: {
      cultist:  '#7B3D8B',
      revenant: '#C090D0',
    },
  },

  'watchers-spire': {
    // Iron-disciplined soldiers: tanky guards anchor the line while fast wardens
    // shred wraiths. Requires a mixed force of 15+ with zombies up front.
    composition: { guard: 15, warden: 8 },
    stats: {
      guard:  { hp: 20, dmg: 10, speed: 0.9 },
      warden: { hp: 12, dmg: 18, speed: 1.5 },
    },
    color: {
      guard:  '#607890',
      warden: '#9ABCD8',
    },
  },

  'ossuary-of-vael': {
    // Elite undead lords. Liches burst wraiths; death knights stall for them.
    // Needs 25+ units with active damage bonuses and a zombie vanguard.
    composition: { bone_warrior: 20, lich: 4, death_knight: 6 },
    stats: {
      bone_warrior: { hp: 15, dmg: 12, speed: 1.0 },
      lich:         { hp: 8,  dmg: 30, speed: 0.6 },
      death_knight: { hp: 40, dmg: 20, speed: 0.8 },
    },
    color: {
      bone_warrior: '#D0C4A8',
      lich:         '#50D860',
      death_knight: '#CC3030',
    },
  },
};

export const PLAYER_BASE_STATS = {
  skeleton: { hp: 10, dmg: 10, speed: 1.0 },
  zombie:   { hp: 25, dmg: 8,  speed: 0.6 },
  wraith:   { hp: 6,  dmg: 20, speed: 1.8 },
};

export const PLAYER_COLORS = {
  skeleton: '#D4B88C',
  zombie:   '#7A9E6E',
  wraith:   '#9B7ED4',
};

type DerivedBonuses = {
  skeletonHpBonus: number; skeletonDamageBonus: number;
  zombieHpBonus: number;   zombieDamageBonus: number;
  wraithHpBonus: number;   wraithDamageBonus: number;
  surgeDamageMultiplier: number;
};

export function buildAttackerConfig(
  composition: Record<string, number>,
  bonuses: DerivedBonuses,
): SideConfig {
  const b = bonuses;
  const sdm = b.surgeDamageMultiplier;
  return {
    composition: { ...composition },
    stats: {
      skeleton: { hp: 10 * (1 + b.skeletonHpBonus), dmg: 10 * (1 + b.skeletonDamageBonus) * sdm, speed: 1.0 },
      zombie:   { hp: 25 * (1 + b.zombieHpBonus),   dmg: 8  * (1 + b.zombieDamageBonus)   * sdm, speed: 0.6 },
      wraith:   { hp: 6  * (1 + b.wraithHpBonus),   dmg: 20 * (1 + b.wraithDamageBonus)   * sdm, speed: 1.8 },
    },
    color: PLAYER_COLORS as Record<string, string>,
    spawnArea: { x: 10, y: 10, w: 55, h: COMBAT_H - 20 },
  };
}

export type CombatOutcome = {
  winner: 'a' | 'b' | 'draw';
  survivorsByType: Record<string, number>;
};

export function simulateBattle(
  attackerConfig: SideConfig,
  dungeonId: string,
): CombatOutcome {
  const enemyDef = DUNGEON_ENEMY_DEFS[dungeonId];
  if (!enemyDef) {
    return { winner: 'a', survivorsByType: { ...attackerConfig.composition } };
  }

  const defenderConfig: SideConfig = {
    ...enemyDef,
    spawnArea: { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
  };

  const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H });
  engine.setSide('a', attackerConfig);
  engine.setSide('b', defenderConfig);
  engine.start();

  const DT = 16;
  const MAX_TICKS = 1875; // 30-second cap
  let ticks = 0;
  while (engine.getWinner() === null && ticks < MAX_TICKS) {
    engine.tick(DT);
    ticks++;
  }

  return {
    winner: engine.getWinner() ?? 'draw',
    survivorsByType: engine.getCounts()['a'],
  };
}
