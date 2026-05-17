import { useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { buildAttackerConfig, COMBAT_W, COMBAT_H } from '../combat/dungeonCombat';
import { DUNGEON_DEFS } from './dungeons';

export function useCombatWorkers() {
  const resolveFight = useGameStore(s => s.resolveFight);
  const workersRef = useRef<Map<string, Worker>>(new Map());

  // Keep workers updated with the latest combat speed
  const combatSpeedMultiplier = useGameStore(s => s.derived.combatSpeedMultiplier);
  useEffect(() => {
    for (const worker of workersRef.current.values()) {
      worker.postMessage({ type: 'setSpeed', multiplier: combatSpeedMultiplier });
    }
  }, [combatSpeedMultiplier]);

  // Manage worker lifecycle as squads enter/leave fighting state
  const fightingSquads = useGameStore(s => s.squads.filter(sq => sq.state === 'fighting'));
  useEffect(() => {
    const workers = workersRef.current;
    const fightingIds = new Set(fightingSquads.map(s => s.id));

    // Terminate workers for squads no longer fighting
    for (const [id, worker] of workers) {
      if (!fightingIds.has(id)) {
        worker.terminate();
        workers.delete(id);
      }
    }

    // Start workers for newly fighting squads
    for (const squad of fightingSquads) {
      if (workers.has(squad.id)) continue;
      if (squad.fightSeed === undefined || !squad.targetDungeonId) continue;

      const enemyDef = DUNGEON_DEFS[squad.targetDungeonId].enemies;
      if (!enemyDef) continue;

      // Snapshot derived at fight-start so bonuses don't shift mid-fight
      const derived = useGameStore.getState().derived;
      const attackerConfig = buildAttackerConfig(squad.composition, {
        skeletonHpBonus: derived.skeletonHpBonus,
        skeletonDamageBonus: derived.skeletonDamageBonus,
        zombieHpBonus: derived.zombieHpBonus,
        zombieDamageBonus: derived.zombieDamageBonus,
        wraithHpBonus: derived.wraithHpBonus,
        wraithDamageBonus: derived.wraithDamageBonus,
        surgeDamageMultiplier: derived.surgeDamageMultiplier,
      });
      const defenderConfig = {
        units: enemyDef,
        spawnArea: { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
      };

      const worker = new Worker(new URL('../combat/combat.worker.ts', import.meta.url), { type: 'module' });
      const squadId = squad.id;
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'result') {
          resolveFight(squadId, e.data.winner, e.data.survivorsByType);
          worker.terminate();
          workers.delete(squadId);
        }
      };
      worker.postMessage({
        type: 'start',
        attackerConfig,
        defenderConfig,
        seed: squad.fightSeed,
        speedMultiplier: useGameStore.getState().derived.combatSpeedMultiplier,
      });
      workers.set(squad.id, worker);
    }
  }, [fightingSquads, resolveFight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const worker of workersRef.current.values()) worker.terminate();
      workersRef.current.clear();
    };
  }, []);
}
