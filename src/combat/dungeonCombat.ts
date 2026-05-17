import type { SideConfig } from './types';

export const COMBAT_W = 360;
export const COMBAT_H = 180;

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
  composition: Record<'skeleton' | 'zombie' | 'wraith', number>,
  bonuses: DerivedBonuses,
): SideConfig {
  const b = bonuses;
  const sdm = b.surgeDamageMultiplier;
  const statsByUnit = {
    skeleton: { hp: 10 * (1 + b.skeletonHpBonus), dmg: 10 * (1 + b.skeletonDamageBonus) * sdm, speed: 1.0 },
    zombie:   { hp: 25 * (1 + b.zombieHpBonus),   dmg: 8  * (1 + b.zombieDamageBonus)   * sdm, speed: 0.6 },
    wraith:   { hp: 6  * (1 + b.wraithHpBonus),   dmg: 20 * (1 + b.wraithDamageBonus)   * sdm, speed: 1.8 },
  }

  return {
    units: Object.entries(composition).map(([key, value]) => {
      return {
        name: key,
        amount: value,
        stats: statsByUnit[key as 'skeleton' | 'zombie' | 'wraith'],
        color: PLAYER_COLORS[key as 'skeleton' | 'zombie' | 'wraith'],
      }
    }),
    spawnArea: { x: 10, y: 10, w: 55, h: COMBAT_H - 20 },
  };
}

export type CombatOutcome = {
  winner: 'a' | 'b' | 'draw';
  survivorsByType: Record<string, number>;
};

// export function simulateBattle(
//   attackerConfig: SideConfig,
//   dungeonId: string,
// ): CombatOutcome {
//   const enemyDef = DUNGEON_DEFS[dungeonId].enemies;
//   if (!enemyDef) {
//     return { winner: 'a', survivorsByType: { ...attackerConfig.composition } };
//   }

//   const defenderConfig: SideConfig = {
//     enemies: enemyDef,
//     spawnArea: { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
//   };

//   const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H });
//   engine.setSide('a', attackerConfig);
//   engine.setSide('b', defenderConfig);
//   engine.start();

//   const DT = 16;
//   const MAX_TICKS = 1875; // 30-second cap
//   let ticks = 0;
//   while (engine.getWinner() === null && ticks < MAX_TICKS) {
//     engine.tick(DT);
//     ticks++;
//   }

//   return {
//     winner: engine.getWinner() ?? 'draw',
//     survivorsByType: engine.getCounts()['a'],
//   };
// }
