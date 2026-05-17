import { create } from 'zustand';
import type { GameState, SlotId, PoolId, UnitType, Rarity } from './types';
import { gameTick, generateLoot, UNIT_STATS, SURGE_COOLDOWN, SURGE_DURATION } from './tick';
import { recomputeDerived, canPurchaseUpgrade, UPGRADE_NODES } from './upgrades';
import { executePull, POOL_CONFIGS } from './gacha';
import { DUST_VALUES, fuseRelics } from './relics';
import { saveGame, loadGame, clearSave } from './save';
import { DUNGEON_DEFS } from './data/dungeons';
import { makeDungeonState } from './dungeons';

const SQUAD_NAMES = [
  'Coldfingers', 'Pale Choir', 'Drift of Vael', 'Marrow-Eight',
  'Husk Brigade', 'Bone Tide', 'Ash Cohort', 'Grey Shamble',
  'Cinder March', 'Hollow Host', 'Dusk Banner', 'Rot Company',
];

let squadNameIdx = 0;
function nextSquadName(): string {
  return SQUAD_NAMES[squadNameIdx++ % SQUAD_NAMES.length];
}

let squadIdCounter = 0;
function nextSquadId(): string {
  return `S-${String(++squadIdCounter).padStart(2, '0')}`;
}

function buildInitialState(): GameState {
  const dungeonStates = DUNGEON_DEFS.map(def => makeDungeonState(def, def.id === 'paupers-tomb'));

  const state: Omit<GameState, 'derived'> = {
    resources: { bones: 200, coins: 0, souls: 0, dust: 0, corpses: 0 },
    units: { skeletons: 10, zombies: 0, wraiths: 0 },
    squads: [],
    dungeons: dungeonStates,
    relics: { inventory: [], equipped: {} },
    upgrades: { purchased: [], availablePoints: 0 },
    surge: {
      cooldownTicks: 0,
      charges: 3,
      activeBuff: null,
      buffTicksRemaining: 0,
    },
    gacha: {
      pityCounters: { bone: 0, soul: 0, forbidden: 0 },
      pullHistory: [],
      sessionTotals: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      lastPulledRelics: null,
    },
    meta: { tickCount: 0, dayCount: 0, version: 1 },
  };

  const derived = recomputeDerived(state as GameState);
  return { ...state, derived } as GameState;
}

interface StoreActions {
  tick: (deltaMs: number) => void;
  dispatchSquad: (squadId: string, dungeonId: string) => void;
  recallSquad: (squadId: string) => void;
  createSquad: (composition: Record<UnitType, number>, name?: string) => string | null;
  deleteSquad: (squadId: string) => void;
  equipRelic: (relicId: string, slotId: SlotId) => void;
  unequipRelic: (slotId: SlotId) => void;
  sacrificeRelic: (relicId: string) => void;
  fuseRelicsAction: (baseId: string, rarity: Rarity) => void;
  purchaseUpgrade: (nodeId: string) => void;
  pull: (poolId: PoolId, count: 1 | 10) => void;
  clearLastPulled: () => void;
  activateSurge: (buff: 'yield' | 'speed' | 'damage') => void;
  resolveFight: (squadId: string, winner: 'a' | 'b' | 'draw', survivorsByType: Record<string, number>) => void;
  recomputeDerivedAction: () => void;
  resetSave: () => void;
  markRelicsOld: () => void;
  summonUnits: (type: UnitType, count: number) => void;
}

let tickAccumulator = 0;
const TICK_MS = 100;
let saveCounter = 0;

export const useGameStore = create<GameState & StoreActions>()((set, get) => {
  // Attempt to load saved game
  const rawSaved = loadGame();
  // Migrate: retreat any squad interrupted mid-fight (fighting state cannot be resumed).
  if (rawSaved?.squads) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawSaved.squads = rawSaved.squads.map((s: any) => {
      if (s.state !== 'fighting') return s;
      return { ...s, state: 'returning', position: 1.0, pendingLoot: null };
    });
    // Sync counter so new squads don't collide with persisted IDs.
    for (const s of rawSaved.squads as Array<{ id: string }>) {
      const m = /^S-(\d+)$/.exec(s.id);
      if (m) squadIdCounter = Math.max(squadIdCounter, parseInt(m[1], 10));
    }
  }
  const baseState = rawSaved ? { ...buildInitialState(), ...rawSaved, derived: undefined } as unknown as GameState : buildInitialState();
  const initialDerived = recomputeDerived(baseState);
  const initialState: GameState = { ...baseState, derived: initialDerived };

  return {
    ...initialState,

    tick: (deltaMs: number) => {
      tickAccumulator += deltaMs;
      let ticked = false;

      while (tickAccumulator >= TICK_MS) {
        tickAccumulator -= TICK_MS;
        const state = get();
        const delta = gameTick(state);

        // Merge delta
        set(prev => {
          const next = { ...prev, ...delta };
          // Recompute derived when surge changed
          if (delta.surge || delta.relics || delta.upgrades) {
            next.derived = recomputeDerived(next);
          }
          return next;
        });
        ticked = true;
      }

      if (ticked) {
        saveCounter++;
        if (saveCounter >= 50) {
          saveCounter = 0;
          saveGame(get());
        }

        // Recompute derived periodically to pick up surge changes
        const state = get();
        const newDerived = recomputeDerived(state);
        set({ derived: newDerived });
      }
    },

    dispatchSquad: (squadId: string, dungeonId: string) => {
      set(prev => {
        const squad = prev.squads.find(s => s.id === squadId);
        const dungeonState = prev.dungeons.find(d => d.id === dungeonId);
        if (!squad || !dungeonState) return prev;
        if (!dungeonState.unlocked) return prev;
        if (squad.state !== 'idle') return prev;

        const totalUnits = Object.values(squad.composition).reduce((s, n) => s + n, 0);
        if (totalUnits === 0) return prev;

        const derived = prev.derived;
        const hpBonuses = {
          skeleton: 1 + derived.skeletonHpBonus,
          zombie: 1 + derived.zombieHpBonus,
          wraith: 1 + derived.wraithHpBonus,
        };

        const newSquads = prev.squads.map(s => {
          if (s.id !== squadId) return s;
          return {
            ...s,
            state: 'traveling' as const,
            targetDungeonId: dungeonId,
            position: 0,
            currentHp: {
              skeleton: s.composition.skeleton * 10 * hpBonuses.skeleton,
              zombie: s.composition.zombie * 25 * hpBonuses.zombie,
              wraith: s.composition.wraith * 6 * hpBonuses.wraith,
            },
          };
        });

        return { squads: newSquads };
      });
    },

    recallSquad: (squadId: string) => {
      set(prev => {
        const newSquads = prev.squads.map(s => {
          if (s.id !== squadId) return s;
          if (s.state === 'idle' || s.state === 'returning') return s;
          return { ...s, state: 'returning' as const, pendingLoot: null, manualRecall: true };
        });
        return { squads: newSquads };
      });
    },

    resolveFight: (squadId: string, winner: 'a' | 'b' | 'draw', survivorsByType: Record<string, number>) => {
      set(prev => {
        const squad = prev.squads.find(s => s.id === squadId);
        if (!squad || squad.state !== 'fighting') return prev;

        const dungeonId = squad.targetDungeonId!;
        const dungeonState = prev.dungeons.find(d => d.id === dungeonId);
        const def = DUNGEON_DEFS.find(d => d.id === dungeonId);
        if (!dungeonState || !def) return prev;

        if (winner !== 'a') {
          return { squads: prev.squads.filter(s => s.id !== squadId) };
        }

        const derived = prev.derived;
        const newComposition = { ...squad.composition };
        const newCurrentHp = { ...squad.currentHp };
        for (const type of ['skeleton', 'zombie', 'wraith'] as const) {
          const survivors = survivorsByType[type] ?? 0;
          const hpBonus = type === 'skeleton' ? derived.skeletonHpBonus
            : type === 'zombie' ? derived.zombieHpBonus : derived.wraithHpBonus;
          newComposition[type] = survivors;
          newCurrentHp[type] = survivors * UNIT_STATS[type].hp * (1 + hpBonus);
        }

        const pendingLoot = generateLoot(dungeonId, dungeonState.clearCount, derived.surgeYieldMultiplier, derived.dropRateBonus);

        const newDungeons = prev.dungeons.map(ds =>
          ds.id === dungeonId ? { ...ds, clearCount: ds.clearCount + 1 } : ds
        );

        const earnedPoints = def.tier;
        const newSquads = prev.squads.map(s =>
          s.id !== squadId ? s : {
            ...s,
            state: 'returning' as const,
            position: 1.0,
            composition: newComposition,
            currentHp: newCurrentHp,
            pendingLoot,
          }
        );

        const next = {
          ...prev,
          squads: newSquads,
          dungeons: newDungeons,
          upgrades: { ...prev.upgrades, availablePoints: prev.upgrades.availablePoints + earnedPoints },
        };
        return { ...next, derived: recomputeDerived(next) };
      });
    },

    createSquad: (composition: Record<UnitType, number>, name?: string) => {
      const state = get();
      const totalUnits = Object.values(composition).reduce((s, n) => s + n, 0);
      if (totalUnits === 0) return null;
      if (totalUnits > state.derived.maxSquadSize) return null;

      // Check unit availability
      if (composition.skeleton > state.units.skeletons) return null;
      if (composition.zombie > state.units.zombies) return null;
      if (composition.wraith > state.units.wraiths) return null;

      const squadId = nextSquadId();
      const squadName = name ?? nextSquadName();

      set(prev => ({
        units: {
          skeletons: prev.units.skeletons - composition.skeleton,
          zombies: prev.units.zombies - composition.zombie,
          wraiths: prev.units.wraiths - composition.wraith,
        },
        squads: [...prev.squads, {
          id: squadId,
          name: squadName,
          composition: { ...composition },
          currentHp: { skeleton: 0, zombie: 0, wraith: 0 },
          targetDungeonId: null,
          state: 'idle' as const,
          position: 0,
          pendingLoot: null,
        }],
      }));

      return squadId;
    },

    deleteSquad: (squadId: string) => {
      set(prev => {
        const squad = prev.squads.find(s => s.id === squadId);
        if (!squad || squad.state === 'fighting') return prev;
        // Return units
        return {
          units: {
            skeletons: prev.units.skeletons + squad.composition.skeleton,
            zombies: prev.units.zombies + squad.composition.zombie,
            wraiths: prev.units.wraiths + squad.composition.wraith,
          },
          squads: prev.squads.filter(s => s.id !== squadId),
        };
      });
    },

    equipRelic: (relicId: string, slotId: SlotId) => {
      set(prev => {
        const relic = prev.relics.inventory.find(r => r.id === relicId);
        if (!relic) return prev;

        // Validate slot compatibility
        const base = prev.relics.inventory.find(r => r.id === relicId);
        if (!base) return prev;

        const newEquipped = { ...prev.relics.equipped };
        // If slot already has something, unequip it (it stays in inventory)
        newEquipped[slotId] = relicId;

        const newState = {
          ...prev,
          relics: { ...prev.relics, equipped: newEquipped },
        };
        return { ...newState, derived: recomputeDerived(newState) };
      });
    },

    unequipRelic: (slotId: SlotId) => {
      set(prev => {
        const newEquipped = { ...prev.relics.equipped };
        delete newEquipped[slotId];
        const newState = { ...prev, relics: { ...prev.relics, equipped: newEquipped } };
        return { ...newState, derived: recomputeDerived(newState) };
      });
    },

    sacrificeRelic: (relicId: string) => {
      set(prev => {
        const relic = prev.relics.inventory.find(r => r.id === relicId);
        if (!relic) return prev;

        // Remove from equipped if equipped
        const newEquipped = { ...prev.relics.equipped };
        for (const [slot, id] of Object.entries(newEquipped)) {
          if (id === relicId) delete newEquipped[slot as SlotId];
        }

        const dustGain = DUST_VALUES[relic.rarity];
        const newInventory = prev.relics.inventory.filter(r => r.id !== relicId);
        const newState = {
          ...prev,
          resources: { ...prev.resources, dust: prev.resources.dust + dustGain },
          relics: { inventory: newInventory, equipped: newEquipped },
        };
        return { ...newState, derived: recomputeDerived(newState) };
      });
    },

    fuseRelicsAction: (baseId: string, rarity: Rarity) => {
      set(prev => {
        const { newInventory, success } = fuseRelics(prev.relics.inventory, baseId, rarity);
        if (!success) return prev;
        const newState = { ...prev, relics: { ...prev.relics, inventory: newInventory } };
        return { ...newState, derived: recomputeDerived(newState) };
      });
    },

    purchaseUpgrade: (nodeId: string) => {
      set(prev => {
        if (!canPurchaseUpgrade(prev, nodeId)) return prev;
        const node = UPGRADE_NODES.find(n => n.id === nodeId);
        if (!node) return prev;

        const newState = {
          ...prev,
          upgrades: {
            purchased: [...prev.upgrades.purchased, nodeId],
            availablePoints: prev.upgrades.availablePoints - node.cost,
          },
        };
        return { ...newState, derived: recomputeDerived(newState) };
      });
    },

    pull: (poolId: PoolId, count: 1 | 10) => {
      set(prev => {
        const config = POOL_CONFIGS[poolId];
        const costConfig = count === 1 ? config.cost1 : config.cost10;
        const resource = costConfig.resource;
        const amount = costConfig.amount;

        const currentAmount = resource === 'bones' ? prev.resources.bones
          : resource === 'coins' ? prev.resources.coins
          : prev.resources.souls;

        if (currentAmount < amount) return prev;

        const { relics: newRelics, pityCounter } = executePull(prev, poolId, count);

        // Build pull records (assembled inline below)

        const newSessionTotals = { ...prev.gacha.sessionTotals };
        for (const r of newRelics) {
          newSessionTotals[r.rarity]++;
        }

        // Update pity
        const newPityCounters = { ...prev.gacha.pityCounters, [poolId]: pityCounter };

        // Deduct cost
        const newResources = { ...prev.resources };
        if (resource === 'bones') newResources.bones -= amount;
        else if (resource === 'coins') newResources.coins -= amount;
        else newResources.souls -= amount;

        // Add relics to inventory (check duplicates)
        const newInventory = [...prev.relics.inventory];
        const pullRecords = [];

        for (const relic of newRelics) {
          // Find existing same base+rarity
          const existingIdx = newInventory.findIndex(r => r.baseId === relic.baseId && r.rarity === relic.rarity);
          if (existingIdx >= 0) {
            newInventory[existingIdx] = {
              ...newInventory[existingIdx],
              duplicateCount: newInventory[existingIdx].duplicateCount + 1,
            };
            // If past 5 dupes and upgrade level 5, auto-sacrifice
            const dupe = newInventory[existingIdx];
            if (dupe.duplicateCount >= 5 && dupe.upgradeLevel >= 5) {
              newInventory.splice(existingIdx, 1);
              newResources.dust += DUST_VALUES[relic.rarity];
            }
            // Auto-fuse if 5 dupes
            if (newInventory[existingIdx]?.duplicateCount >= 4) {
              const { newInventory: fused, success } = fuseRelics(newInventory, relic.baseId, relic.rarity);
              if (success) {
                newInventory.splice(0, newInventory.length, ...fused);
              }
            }
          } else {
            newInventory.push({ ...relic, isNew: true });
          }

          // Get the base for glyph info
          const base = prev.relics.inventory.find(r => r.baseId === relic.baseId);
          pullRecords.push({
            relicId: relic.id,
            relicName: relic.baseId,
            rarity: relic.rarity,
            poolId,
            glyph: base?.baseId ?? relic.baseId,
            tickCount: prev.meta.tickCount,
          });
        }

        return {
          resources: newResources,
          relics: { ...prev.relics, inventory: newInventory },
          gacha: {
            ...prev.gacha,
            pityCounters: newPityCounters,
            pullHistory: [
              ...pullRecords.map((pr, i) => ({
                ...pr,
                relicName: newRelics[i].baseId,
                glyph: newRelics[i].baseId,
              })),
              ...prev.gacha.pullHistory,
            ].slice(0, 50),
            sessionTotals: newSessionTotals,
            lastPulledRelics: newRelics,
          },
        };
      });
    },

    clearLastPulled: () => {
      set(prev => ({
        gacha: { ...prev.gacha, lastPulledRelics: null },
      }));
    },

    activateSurge: (buff: 'yield' | 'speed' | 'damage') => {
      set(prev => {
        if (prev.surge.charges <= 0) return prev;
        const newSurge = {
          ...prev.surge,
          charges: prev.surge.charges - 1,
          activeBuff: buff,
          buffTicksRemaining: SURGE_DURATION,
          cooldownTicks: prev.surge.cooldownTicks > 0 ? prev.surge.cooldownTicks : SURGE_COOLDOWN,
        };
        // Start cooldown if not running
        if (prev.surge.cooldownTicks <= 0) {
          newSurge.cooldownTicks = SURGE_COOLDOWN;
        }
        const newState = { ...prev, surge: newSurge };
        return { ...newState, derived: recomputeDerived(newState) };
      });
    },

    recomputeDerivedAction: () => {
      set(prev => ({ ...prev, derived: recomputeDerived(prev) }));
    },

    resetSave: () => {
      clearSave();
      const freshState = buildInitialState();
      set(freshState);
    },

    markRelicsOld: () => {
      set(prev => ({
        relics: {
          ...prev.relics,
          inventory: prev.relics.inventory.map(r => ({ ...r, isNew: false })),
        },
      }));
    },

    summonUnits: (type: UnitType, count: number) => {
      set(prev => {
        // Cost: skeleton=10 bones, zombie=5 bones+1 corpse, wraith=20 bones+1 soul
        let bonesCost = 0;
        let corpsesCost = 0;
        let soulsCost = 0;

        if (type === 'skeleton') {
          const costMultiplier = 1 - prev.derived.summonCostBonus;
          bonesCost = Math.round(10 * count * costMultiplier);
        } else if (type === 'zombie') {
          if (!prev.derived.zombiesUnlocked) return prev;
          bonesCost = 5 * count;
          corpsesCost = count;
        } else if (type === 'wraith') {
          if (!prev.derived.wraithsUnlocked) return prev;
          bonesCost = 20 * count;
          soulsCost = count;
        }

        if (prev.resources.bones < bonesCost) return prev;
        if (prev.resources.corpses < corpsesCost) return prev;
        if (prev.resources.souls < soulsCost) return prev;

        return {
          resources: {
            ...prev.resources,
            bones: prev.resources.bones - bonesCost,
            corpses: prev.resources.corpses - corpsesCost,
            souls: prev.resources.souls - soulsCost,
          },
          units: {
            ...prev.units,
            skeletons: prev.units.skeletons + (type === 'skeleton' ? count : 0),
            zombies: prev.units.zombies + (type === 'zombie' ? count : 0),
            wraiths: prev.units.wraiths + (type === 'wraith' ? count : 0),
          },
        };
      });
    },
  };
});

