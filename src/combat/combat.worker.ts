/// <reference lib="webworker" />

import { CombatEngine } from './engine';
import { COMBAT_W, COMBAT_H } from './dungeonCombat';
import type { SideConfig } from './types';

type InMsg =
  | { type: 'start'; attackerConfig: SideConfig; defenderConfig: SideConfig; seed: number; speedMultiplier: number }
  | { type: 'setSpeed'; multiplier: number };

const FIXED_DT = 16;
const MAX_CATCHUP_MS = 500;

let engine: CombatEngine | null = null;
let accumulator = 0;
let last = 0;
let speedMultiplier = 1;
let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  if (msg.type === 'start') {
    if (intervalId !== null) clearInterval(intervalId);

    engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed: msg.seed });
    engine.setSide('a', msg.attackerConfig);
    engine.setSide('b', msg.defenderConfig);
    engine.start();

    speedMultiplier = msg.speedMultiplier;
    accumulator = 0;
    last = Date.now();

    intervalId = setInterval(tick, 16);
  } else if (msg.type === 'setSpeed') {
    speedMultiplier = msg.multiplier;
  }
};

function tick() {
  if (!engine) return;

  const now = Date.now();
  accumulator += Math.min(now - last, MAX_CATCHUP_MS) * speedMultiplier;
  last = now;

  while (accumulator >= FIXED_DT) {
    engine.tick(FIXED_DT);
    accumulator -= FIXED_DT;

    const winner = engine.getWinner();
    if (winner !== null) {
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      self.postMessage({ type: 'result', winner, survivorsByType: engine.getCounts()['a'] });
      engine = null;
      return;
    }
  }
}
