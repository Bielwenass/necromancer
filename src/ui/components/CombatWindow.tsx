import { useEffect, useRef } from 'react';
import { CombatEngine } from '../../combat/engine';
import { COMBAT_W, COMBAT_H, buildAttackerConfig } from '../../combat/dungeonCombat';
import type { SideConfig } from '../../combat/types';
import type { Squad, DungeonDef } from '../../game/types';
import { useGameStore } from '../../game/store';

export function CombatWindow({ squad, def }: { squad: Squad; def: DungeonDef }) {
  const resolveFight = useGameStore(s => s.resolveFight);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CombatEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const restartPendingRef = useRef(false);
  const reportedRef = useRef(false);

  useEffect(() => {
    const defenderConfig: SideConfig | null = {
      units: def.enemies,
      spawnArea: { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
    }

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

    const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed: squad.fightSeed });
    engine.setSide('a', attackerConfig);
    if (defenderConfig) engine.setSide('b', defenderConfig);
    engine.start();

    // Fast-forward to match the worker's current position in the fight
    if (squad.fightStartWallTime) {
      const speed = derived.combatSpeedMultiplier;
      const elapsed = (Date.now() - squad.fightStartWallTime) * speed;
      const FIXED_DT = 16;
      const catchUpTicks = Math.floor(elapsed / FIXED_DT);
      for (let i = 0; i < catchUpTicks && engine.getWinner() === null; i++) {
        engine.tick(FIXED_DT);
      }
    }

    engineRef.current = engine;
    lastTsRef.current = 0;
    restartPendingRef.current = false;
    reportedRef.current = false;

    function loop(ts: number) {
      const eng = engineRef.current;
      const canvas = canvasRef.current;
      if (!eng || !canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      if (lastTsRef.current === 0) lastTsRef.current = ts;
      const speed = useGameStore.getState().derived.combatSpeedMultiplier;
      const dt = Math.min(ts - lastTsRef.current, 50) * speed;
      lastTsRef.current = ts;

      eng.tick(dt);
      eng.render(ctx);

      const winner = eng.getWinner();
      if (winner !== null && !restartPendingRef.current) {
        restartPendingRef.current = true;

        // Report outcome to game state on the first completion only.
        if (!reportedRef.current) {
          reportedRef.current = true;
          const survivorsByType = eng.getCounts()['a'];
          resolveFight(squad.id, winner, survivorsByType);
        }

        setTimeout(() => {
          if (engineRef.current) {
            engineRef.current.start();
            lastTsRef.current = 0;
            restartPendingRef.current = false;
          }
        }, 1500);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      engineRef.current = null;
    };
  }, [squad.id, def.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={COMBAT_W}
      height={COMBAT_H}
      style={{ display: 'block', width: '100%' }}
    />
  );
}
