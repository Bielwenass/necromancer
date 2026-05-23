/**
 * Headless combat benchmark with accel sub-phase breakdown.
 *
 * Run: `npx tsx src/combat/benchmark.ts`
 *
 * Replace STATS / makeConfig with your real buildAttackerConfig + enemy defs
 * for accurate numbers. The phase split is what tells us where to optimize.
 */

import { CombatEngine } from './engine';
import { COMBAT_W, COMBAT_H } from './dungeonCombat';
import type { SideConfig } from './types';

// ── Adjust to match real unit stats ──────────────────────────
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

const SCENARIOS = [100, 250, 500, 1000];
const SEEDS = [0xCAFE, 0xBEEF, 0xF00D];
const MAX_TICKS = 20000;

interface RunResult {
  n: number;
  ticks: number;
  wallMs: number;
  perTickMs: number;

  // accel sub-phase percentages (of accelMs)
  queryPct: number;
  neighborLoopPct: number;
  seekFallbackPct: number;
  integratePct: number;
  accelPctOfTotal: number;

  // neighbor telemetry
  avgNeighbors: number;
  maxNeighbors: number;
  avgQueriesPerUnit: number;
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
  const accelTotal = s.queryMs + s.neighborLoopMs + s.seekFallbackMs + s.integrateMs;
  const pct = (ms: number, base: number) => base > 0 ? (ms / base) * 100 : 0;

  return {
    n,
    ticks: s.numTicks,
    wallMs: s.wallTimeMs,
    perTickMs: s.numTicks > 0 ? s.wallTimeMs / s.numTicks : 0,
    queryPct: pct(s.queryMs, accelTotal),
    neighborLoopPct: pct(s.neighborLoopMs, accelTotal),
    seekFallbackPct: pct(s.seekFallbackMs, accelTotal),
    integratePct: pct(s.integrateMs, accelTotal),
    accelPctOfTotal: pct(s.accelMs, phaseTotal),
    avgNeighbors: s.unitsProcessed > 0 ? s.neighborsVisited / s.unitsProcessed : 0,
    maxNeighbors: s.maxNeighbors,
    avgQueriesPerUnit: s.unitsProcessed > 0 ? s.queryCalls / s.unitsProcessed : 0,
  };
}

function summarize(results: RunResult[]): void {
  const n = results[0].n;
  const avg = (f: (r: RunResult) => number) =>
    results.reduce((s, r) => s + f(r), 0) / results.length;

  console.log(`\n── ${n}v${n} (avg over ${results.length} seeds) ──`);
  console.log(`  ticks:        ${avg(r => r.ticks).toFixed(0)}`);
  console.log(`  per tick:     ${avg(r => r.perTickMs).toFixed(3)}ms   (accel = ${avg(r => r.accelPctOfTotal).toFixed(0)}% of total)`);
  console.log(`  accel split:  query ${avg(r => r.queryPct).toFixed(0)}%  neighborLoop ${avg(r => r.neighborLoopPct).toFixed(0)}%  seekFallback ${avg(r => r.seekFallbackPct).toFixed(0)}%  integrate ${avg(r => r.integratePct).toFixed(0)}%`);
  console.log(`  neighbors:    avg ${avg(r => r.avgNeighbors).toFixed(1)}/unit  max ${avg(r => r.maxNeighbors).toFixed(0)}  queries ${avg(r => r.avgQueriesPerUnit).toFixed(2)}/unit`);
}

console.log('Combat benchmark — accel sub-phase breakdown');
console.log(`Board: ${COMBAT_W}×${COMBAT_H}, step: 16ms`);

runOnce(50, 0); // warm-up

for (const n of SCENARIOS) {
  const results: RunResult[] = [];
  for (const seed of SEEDS) results.push(runOnce(n, seed));
  summarize(results);
}

console.log('\nDone.');
console.log('\nReading guide:');
console.log('  - query high      → queryRadius itself is costly (cell iteration / result alloc)');
console.log('  - neighborLoop high → per-neighbor force math; density-driven, cut via cell aggregates');
console.log('  - seekFallback high → many units firing the second query; widen-seek is the culprit');
console.log('  - integrate high   → unlikely, but would point at the integration pass');
console.log('  - avgNeighbors growing with n → density scaling; the core 1000v1000 problem');