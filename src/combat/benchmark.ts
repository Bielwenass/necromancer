/**
 * Headless combat benchmark.
 *
 * Run with: `bunx tsx src/combat/benchmark.ts`
 *
 * For accurate numbers, replace the placeholder STATS / makeConfig below with
 * your real `buildAttackerConfig` and `DUNGEON_DEFS[id].enemies`. The shape of
 * the scaling curve is what matters most — whether you're at 0.5ms or 50ms per
 * tick at 500v500 decides whether catch-up needs chunking.
 */

import { CombatEngine } from './engine';
import { COMBAT_W, COMBAT_H } from './dungeonCombat';
import type { SideConfig } from './types';

// ── Optionally adjust these to match your real unit stats ───────────────
const STATS = {
  skeleton: { hp: 10, dmg: 2, speed: 1 },
};

function makeConfig(count: number, leftSide: boolean): SideConfig {
  return {
    units: [{ name: 'skeleton', amount: count, stats: STATS.skeleton, color: 'white' }],
    spawnArea: leftSide
      ? { x: 10, y: 10, w: 55, h: COMBAT_H - 20 }
      : { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
  };
}

const SCENARIOS = [25, 50, 100, 250, 500, 1000];
const SEEDS = [0xCAFE, 0xBEEF, 0xF00D];
const MAX_TICKS = 20000; // safety cap; ~5 minutes of sim time

interface RunResult {
  n: number;
  seed: number;
  winner: string | null;
  survivorsA: number;
  survivorsB: number;
  ticks: number;
  simSec: number;
  wallMs: number;
  perTickMs: number;
  hashBuildPct: number;
  accelPct: number;
  collisionPct: number;
  damagePct: number;
}

function runOnce(n: number, seed: number): RunResult {
  const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed });
  engine.setSide('a', makeConfig(n, true));
  engine.setSide('b', makeConfig(n, false));
  engine.start();

  while (engine.getWinner() === null && engine.stats.numTicks < MAX_TICKS) {
    engine.tick(16);
  }

  const s = engine.stats;
  const phaseTotal = s.hashBuildMs + s.accelMs + s.collisionMs + s.damageMs;
  const pct = (ms: number) => phaseTotal > 0 ? (ms / phaseTotal) * 100 : 0;

  return {
    n,
    seed,
    winner: engine.getWinner(),
    survivorsA: engine.getTotalCount('a'),
    survivorsB: engine.getTotalCount('b'),
    ticks: s.numTicks,
    simSec: s.simTimeMs / 1000,
    wallMs: s.wallTimeMs,
    perTickMs: s.numTicks > 0 ? s.wallTimeMs / s.numTicks : 0,
    hashBuildPct: pct(s.hashBuildMs),
    accelPct: pct(s.accelMs),
    collisionPct: pct(s.collisionMs),
    damagePct: pct(s.damageMs),
  };
}

function summarize(results: RunResult[]): void {
  const n = results[0].n;
  const avg = (f: (r: RunResult) => number) =>
    results.reduce((s, r) => s + f(r), 0) / results.length;
  const min = (f: (r: RunResult) => number) =>
    Math.min(...results.map(f));
  const max = (f: (r: RunResult) => number) =>
    Math.max(...results.map(f));

  console.log(`\n── ${n}v${n} (avg over ${results.length} seeds) ──`);
  console.log(`  winner:       ${results.map(r => r.winner).join(', ')}`);
  console.log(`  ticks:        avg ${avg(r => r.ticks).toFixed(0)}  range ${min(r => r.ticks)}–${max(r => r.ticks)}`);
  console.log(`  sim time:     avg ${avg(r => r.simSec).toFixed(2)}s`);
  console.log(`  wall time:    avg ${avg(r => r.wallMs).toFixed(0)}ms  range ${min(r => r.wallMs).toFixed(0)}–${max(r => r.wallMs).toFixed(0)}ms`);
  console.log(`  per tick:     avg ${avg(r => r.perTickMs).toFixed(3)}ms`);
  console.log(`  phase split:  hash ${avg(r => r.hashBuildPct).toFixed(0)}%  accel ${avg(r => r.accelPct).toFixed(0)}%  collision ${avg(r => r.collisionPct).toFixed(0)}%  damage ${avg(r => r.damagePct).toFixed(0)}%`);
}

console.log('Combat engine benchmark');
console.log(`Board: ${COMBAT_W}×${COMBAT_H}, step: 16ms, max ticks: ${MAX_TICKS}`);

// Warm-up so JIT settles before measurements
runOnce(50, 0);

for (const n of SCENARIOS) {
  const results: RunResult[] = [];
  for (const seed of SEEDS) {
    results.push(runOnce(n, seed));
  }
  summarize(results);
}

console.log('\nDone.');