import type { GameState, Resources } from './types';
import { DUNGEON_DEFS } from './data/dungeons';
import { checkUnlockConditions } from './dungeons';

const UNIT_STATS = {
  skeleton: { hp: 10, dmg: 3, speed: 1.0 },
  zombie:   { hp: 25, dmg: 4, speed: 0.6 },
  wraith:   { hp: 6,  dmg: 8, speed: 1.5 },
};

const SURGE_COOLDOWN = 900;  // ticks
const SURGE_DURATION = 180;  // ticks
const SURGE_MAX_CHARGES = 3;
const TICKS_PER_DAY = 1200;  // 2 minutes per in-game day

export function generateLoot(dungeonId: string, clearCount: number, surgeYield: number, dropRateBonus: number): Partial<Resources> {
  const def = DUNGEON_DEFS[dungeonId];
  if (!def) return {};

  const clearBonus = 1 + Math.log(clearCount + 1) * 0.2;
  const yieldMult = surgeYield * (1 + dropRateBonus);
  const lt = def.lootTable;

  const bones = Math.round(
    (lt.bonesMin + Math.random() * (lt.bonesMax - lt.bonesMin)) * clearBonus * yieldMult
  );
  const coins = Math.round(
    (lt.coinsMin + Math.random() * (lt.coinsMax - lt.coinsMin)) * clearBonus * yieldMult
  );
  const corpses = Math.round(
    (lt.corpseMin + Math.random() * (lt.corpseMax - lt.corpseMin)) * clearBonus
  );
  const souls = Math.random() < lt.soulChance * yieldMult ? 1 : 0;

  return { bones, coins, corpses, souls };
}


export function gameTick(state: GameState): Partial<GameState> {
  const result: Partial<GameState> = {};
  const derived = state.derived;

  // ── 1. Passive resources ─────────────────────────────────────
  const newResources = { ...state.resources };
  newResources.bones += derived.bonesPerTick;
  newResources.coins += derived.coinsPerTick;
  newResources.souls += derived.soulsPerTick;

  // ── 2 & 3 & 4. Advance squads ────────────────────────────────
  let earnedPoints = 0;
  const newSquads = state.squads.map(squad => {
    const updated = { ...squad, currentHp: { ...squad.currentHp }, composition: { ...squad.composition } };

    if (squad.state === 'traveling') {
      const def = DUNGEON_DEFS[squad.targetDungeonId!];
      if (!def) return updated;
      const speedMult = derived.surgeSpeedMultiplier;
      updated.position += (1 / def.travelTimeTicks) * speedMult;

      if (updated.position >= 1) {
        updated.position = 0;
        updated.state = 'fighting';
        updated.fightSeed = Math.floor(Math.random() * 0xFFFFFFFF);
        updated.fightStartWallTime = Date.now();
        // Restore full HP on arrival
        for (const type of ['skeleton', 'zombie', 'wraith'] as const) {
          const hpBonus = type === 'skeleton' ? derived.skeletonHpBonus : type === 'zombie' ? derived.zombieHpBonus : derived.wraithHpBonus;
          updated.currentHp[type] = squad.composition[type] * UNIT_STATS[type].hp * (1 + hpBonus);
        }
      }
    } else if (squad.state === 'fighting') {
      // The visual simulation in CombatWindow is the fight — outcome is applied
      // via store.resolveFight() when the engine reports a winner.
    } else if (squad.state === 'returning') {
      const def = DUNGEON_DEFS[squad.targetDungeonId!];
      if (!def) return updated;
      const speedMult = derived.surgeSpeedMultiplier * (1 + derived.squadReturnSpeedBonus);
      updated.position -= (1 / def.travelTimeTicks) * speedMult;

      if (updated.position <= 0) {
        updated.position = 0;
        updated.state = 'idle';

        // Deposit loot
        if (squad.pendingLoot) {
          const loot = squad.pendingLoot;
          newResources.bones += loot.bones ?? 0;
          newResources.coins += loot.coins ?? 0;
          newResources.souls += loot.souls ?? 0;
          newResources.corpses += loot.corpses ?? 0;
        }
        updated.pendingLoot = null;

        updated.manualRecall = false;

        // Auto-deploy if enabled and not manually recalled
        if (derived.autoDeploy && squad.targetDungeonId && !squad.manualRecall) {
          const dungeonState = (result.dungeons ?? state.dungeons).find(d => d.id === squad.targetDungeonId);
          if (dungeonState && dungeonState.unlocked) {
            const totalUnits = Object.values(updated.composition).reduce((s, n) => s + n, 0);
            if (totalUnits > 0) {
              updated.state = 'traveling';
              updated.position = 0;
              // Restore HP for re-deploy
              for (const type of ['skeleton', 'zombie', 'wraith'] as const) {
                const hpBonus = type === 'skeleton' ? derived.skeletonHpBonus : type === 'zombie' ? derived.zombieHpBonus : derived.wraithHpBonus;
                updated.currentHp[type] = updated.composition[type] * UNIT_STATS[type].hp * (1 + hpBonus);
              }
            }
          }
        }
      }
    }

    return updated;
  });

  // Apply earned upgrade points after all squads are processed
  if (earnedPoints > 0) {
    result.upgrades = {
      ...state.upgrades,
      availablePoints: state.upgrades.availablePoints + earnedPoints,
    };
  }

  // ── 5. Surge ─────────────────────────────────────────────────
  let surge = { ...state.surge };
  if (surge.activeBuff && surge.buffTicksRemaining > 0) {
    surge.buffTicksRemaining--;
    if (surge.buffTicksRemaining <= 0) {
      surge.activeBuff = null;
      surge.buffTicksRemaining = 0;
    }
  }
  if (surge.cooldownTicks > 0) {
    surge.cooldownTicks--;
    if (surge.cooldownTicks <= 0 && surge.charges < SURGE_MAX_CHARGES) {
      surge.charges = Math.min(SURGE_MAX_CHARGES, surge.charges + 1);
      if (surge.charges < SURGE_MAX_CHARGES) {
        surge.cooldownTicks = SURGE_COOLDOWN;
      }
    }
  }

  // Auto-surge if c7 purchased
  if (state.upgrades.purchased.includes('c7') && surge.charges >= SURGE_MAX_CHARGES && !surge.activeBuff) {
    surge.activeBuff = 'damage';
    surge.buffTicksRemaining = SURGE_DURATION;
    surge.charges--;
    surge.cooldownTicks = SURGE_COOLDOWN;
  }

  // ── 6. Unlock check ──────────────────────────────────────────
  if (!result.dungeons) result.dungeons = [...state.dungeons];
  result.dungeons = checkUnlockConditions(result.dungeons);

  // ── 8. Day count ─────────────────────────────────────────────
  const newMeta = { ...state.meta, tickCount: state.meta.tickCount + 1 };
  newMeta.dayCount = Math.floor(newMeta.tickCount / TICKS_PER_DAY);

  return {
    ...result,
    resources: newResources,
    squads: newSquads,
    surge,
    meta: newMeta,
  };
}

export { UNIT_STATS, SURGE_COOLDOWN, SURGE_DURATION, SURGE_MAX_CHARGES };
