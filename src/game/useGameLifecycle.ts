import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import { simulateOffline, type CatchupStats } from './catchupOffline';
import { CombatEngine } from '../combat/engine';
import { buildAttackerConfig, COMBAT_W, COMBAT_H } from '../combat/dungeonCombat';
import { DUNGEON_DEFS } from './data/dungeons';
import { recomputeDerived } from './upgrades';
import { saveGame } from './save';

const FIXED_DT = 16;
const CATCHUP_THRESHOLD_MS = 2000;

export interface CatchupState {
  progress: number;
  stats: CatchupStats;
  done: boolean;
}

export function useGameLifecycle(): { catchup: CatchupState | null; dismissCatchup: () => void } {
  const [catchup, setCatchup] = useState<CatchupState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const catchingUpRef = useRef(false);

  useEffect(() => {
    function startInterval(): void {
      if (intervalRef.current !== null) return;
      intervalRef.current = setInterval(() => {
        // 1. Advance game tick (accumulator handles exact 100ms ticks internally)
        useGameStore.getState().tick(100);

        // 2. Create engines for squads that just entered fighting state
        const stateAfterTick = useGameStore.getState();
        for (const squad of stateAfterTick.squads) {
          if (
            squad.state === 'fighting' &&
            squad.fightSeed !== undefined &&
            squad.targetDungeonId &&
            !stateAfterTick.combatEngines.has(squad.id)
          ) {
            const def = DUNGEON_DEFS[squad.targetDungeonId];
            if (!def) continue;
            const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed: squad.fightSeed });
            engine.setSide('a', buildAttackerConfig(squad.composition, stateAfterTick.derived));
            engine.setSide('b', {
              units: def.enemies,
              spawnArea: { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
            });
            engine.start();
            stateAfterTick.addCombatEngine(squad.id, engine);
          }
        }

        // 3. Advance all active engines and resolve any finished fights
        const { combatEngines, derived, resolveFight, removeCombatEngine } = useGameStore.getState();
        const simMs = 100 * derived.combatSpeedMultiplier;

        for (const [squadId, engine] of combatEngines) {
          let remaining = simMs;
          while (remaining >= FIXED_DT && engine.getWinner() === null) {
            engine.tick(FIXED_DT);
            remaining -= FIXED_DT;
          }
          if (remaining > 0 && engine.getWinner() === null) {
            engine.tick(remaining);
          }
          const winner = engine.getWinner();
          if (winner !== null) {
            const survivorsByType = engine.getCounts()['a'];
            resolveFight(squadId, winner, survivorsByType);
            removeCombatEngine(squadId);
          }
        }
      }, 100);
    }

    function stopInterval(): void {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    async function runCatchup(showOverlay: boolean): Promise<void> {
      if (catchingUpRef.current) return;
      catchingUpRef.current = true;
      stopInterval();
      useGameStore.getState().clearCombatEngines();

      const elapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
      const emptyStats: CatchupStats = { eventsProcessed: 0, bonesGained: 0, coinsGained: 0, soulsGained: 0 };
      if (showOverlay) setCatchup({ progress: 0, stats: emptyStats, done: false });

      const rawResult = await simulateOffline(useGameStore.getState(), elapsed, {
        onProgress: showOverlay ? (cursor, target, stats) => {
          setCatchup({ progress: cursor / target, stats: stats ?? emptyStats, done: false });
        } : undefined,
      });

      const recomputed = recomputeDerived(rawResult);
      useGameStore.setState({
        resources: rawResult.resources,
        squads: rawResult.squads,
        dungeons: rawResult.dungeons,
        meta: rawResult.meta,
        derived: recomputed,
        combatEngines: new Map<string, CombatEngine>(),
      });
      saveGame({ ...rawResult, derived: recomputed });

      if (showOverlay) setCatchup(prev => prev ? { ...prev, done: true } : null);
      catchingUpRef.current = false;
      startInterval();
    }

    function handleVisibility(): void {
      if (document.hidden) {
        stopInterval();
        useGameStore.setState(prev => ({
          meta: { ...prev.meta, lastTickAt: Date.now() },
        }));
        saveGame(useGameStore.getState());
      } else {
        if (catchingUpRef.current) return;
        const elapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
        if (elapsed > CATCHUP_THRESHOLD_MS) {
          runCatchup(true);
        } else {
          startInterval();
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);

    const initialElapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
    if (initialElapsed > CATCHUP_THRESHOLD_MS) {
      runCatchup(false);
    } else {
      startInterval();
    }

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function dismissCatchup(): void {
    setCatchup(null);
  }

  return { catchup, dismissCatchup };
}
