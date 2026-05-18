import { useEffect, useRef } from 'react';
import type { CombatEngine } from '../../combat/engine';
import type { Squad, DungeonDef } from '../../game/types';
import { useGameStore } from '../../game/store';
import { COMBAT_W, COMBAT_H } from '../../combat/dungeonCombat';

export function CombatWindow({ squad, def: _def }: { squad: Squad; def: DungeonDef }) {
  const storeEngine = useGameStore(s => s.combatEngines.get(squad.id));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const engineRef = useRef<CombatEngine | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local ref alive after engine is removed from store (for visual replay).
  useEffect(() => {
    if (storeEngine) {
      engineRef.current = storeEngine;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
    }
  }, [storeEngine]);

  // RAF render loop — persists for the lifetime of the component.
  useEffect(() => {
    const lastTsRef = { current: 0 };
    const squadId = squad.id;

    function loop(ts: number): void {
      const eng = engineRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (eng && ctx) {
        // Tick only during visual replay (engine removed from store map by lifecycle hook).
        if (!useGameStore.getState().combatEngines.has(squadId)) {
          if (lastTsRef.current === 0) lastTsRef.current = ts;
          const speed = useGameStore.getState().derived.combatSpeedMultiplier;
          const dt = Math.min(ts - lastTsRef.current, 50) * speed;
          lastTsRef.current = ts;
          eng.tick(dt);
        } else {
          lastTsRef.current = ts;
        }

        eng.render(ctx);

        if (eng.getWinner() !== null && !restartTimeoutRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            eng.start();
            lastTsRef.current = 0;
            restartTimeoutRef.current = null;
          }, 1500);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={COMBAT_W}
      height={COMBAT_H}
      style={{ display: 'block', width: '100%' }}
    />
  );
}
