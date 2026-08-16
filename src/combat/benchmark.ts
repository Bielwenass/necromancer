/**
 * Headless combat benchmark. `bunx tsx src/combat/benchmark.ts`.
 *
 * Both sides are level-zero skeletons in the real spawn bands: a symmetric worst
 * case. Read the phase split; the absolutes mean little.
 */

import { ENGINE_DT, MAX_HEADLESS_TICKS } from "../game/data/pacing";
import { UNIT_STAT_CONFIG } from "../game/data/units";
import {
	ATTACKER_SPAWN,
	COMBAT_H,
	COMBAT_W,
	DEFENDER_SPAWN,
} from "./dungeonCombat";
import { CombatEngine } from "./engine";
import type { SideConfig, UnitMods } from "./types";

const SKELETON = UNIT_STAT_CONFIG.skeleton;

const NO_MODS: UnitMods = {
	lifesteal: 0,
	regen: 0,
	berserk: 0,
	revive: 0,
	vanguard: 0,
	aura: 0,
	overwhelm: 0,
	executioner: 0,
	spectral: 0,
	lastStand: 0,
};

/** Measured apart: only the aura widens the fine query. */
const MOD_LOADOUTS: { label: string; mods?: UnitMods }[] = [
	{ label: "no modifiers" },
	{
		label: "in-loop modifiers",
		mods: {
			...NO_MODS,
			lifesteal: 0.05,
			regen: 0.02,
			berserk: 0.3,
			revive: 0.3,
			vanguard: 0.3,
			overwhelm: 0.2,
			executioner: 0.3,
			spectral: 0.2,
			lastStand: 0.5,
		},
	},
	{ label: "+ death aura", mods: { ...NO_MODS, aura: 0.1 } },
];

function makeConfig(
	count: number,
	leftSide: boolean,
	mods?: UnitMods,
): SideConfig {
	return {
		units: [
			{
				name: "skeleton",
				amount: count,
				stats: {
					hp: SKELETON.hp.base,
					dmg: SKELETON.dmg.base,
					speed: SKELETON.speed.base,
				},
				color: "white",
				mods,
			},
		],
		spawnArea: leftSide ? ATTACKER_SPAWN : DEFENDER_SPAWN,
	};
}

const SCENARIOS = [100, 250, 500, 1000];
const SEEDS = [0xcafe, 0xbeef, 0xf00d];

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

function runOnce(n: number, seed: number, mods?: UnitMods): RunResult {
	const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed });
	// Side A only: enemies never carry modifiers.
	engine.setSide("a", makeConfig(n, true, mods));
	engine.setSide("b", makeConfig(n, false));
	engine.start();

	while (
		engine.getWinner() === null &&
		engine.stats.numTicks < MAX_HEADLESS_TICKS
	) {
		engine.tick(ENGINE_DT);
	}

	const s = engine.stats;
	const phaseTotal = s.hashBuildMs + s.accelMs + s.collisionMs + s.damageMs;
	const accelTotal =
		s.queryMs + s.neighborLoopMs + s.seekFallbackMs + s.integrateMs;
	const pct = (ms: number, base: number) => (base > 0 ? (ms / base) * 100 : 0);

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
		avgNeighbors:
			s.unitsProcessed > 0 ? s.neighborsVisited / s.unitsProcessed : 0,
		maxNeighbors: s.maxNeighbors,
		avgQueriesPerUnit:
			s.unitsProcessed > 0 ? s.queryCalls / s.unitsProcessed : 0,
	};
}

function summarize(results: RunResult[]): void {
	const n = results[0].n;
	const avg = (f: (r: RunResult) => number) =>
		results.reduce((s, r) => s + f(r), 0) / results.length;

	console.log(`\n── ${n}v${n} (avg over ${results.length} seeds) ──`);
	console.log(`  ticks:        ${avg((r) => r.ticks).toFixed(0)}`);
	console.log(
		`  per tick:     ${avg((r) => r.perTickMs).toFixed(3)}ms   (accel = ${avg((r) => r.accelPctOfTotal).toFixed(0)}% of total)`,
	);
	console.log(`  total duration: ${avg((r) => r.wallMs).toFixed(0)}ms`);
	console.log(
		`  accel split:  query ${avg((r) => r.queryPct).toFixed(0)}%  neighborLoop ${avg((r) => r.neighborLoopPct).toFixed(0)}%  seekFallback ${avg((r) => r.seekFallbackPct).toFixed(0)}%  integrate ${avg((r) => r.integratePct).toFixed(0)}%`,
	);
	console.log(
		`  neighbors:    avg ${avg((r) => r.avgNeighbors).toFixed(1)}/unit  max ${avg((r) => r.maxNeighbors).toFixed(0)}  queries ${avg((r) => r.avgQueriesPerUnit).toFixed(2)}/unit`,
	);
}

console.log("Combat benchmark — accel sub-phase breakdown");
console.log(`Board: ${COMBAT_W}×${COMBAT_H}, step: 16ms`);

runOnce(50, 0); // warm-up

for (const n of SCENARIOS) {
	const results: RunResult[] = [];
	for (const seed of SEEDS) results.push(runOnce(n, seed));
	summarize(results);
}

// Everything but the aura rides along in loops that already run.
console.log("\n── modifier cost, 500v500 (avg over 3 seeds) ──");
for (const { label, mods } of MOD_LOADOUTS) {
	const runs = SEEDS.map((seed) => runOnce(500, seed, mods));
	const perTick = runs.reduce((s, r) => s + r.perTickMs, 0) / runs.length;
	const neighbors = runs.reduce((s, r) => s + r.avgNeighbors, 0) / runs.length;
	console.log(
		`  ${label.padEnd(20)} ${perTick.toFixed(3)}ms/tick   neighbors ${neighbors.toFixed(1)}/unit`,
	);
}

console.log(`
Reading the accel split:
  query          → queryRadius itself; cell iteration and result allocation
  neighborLoop   → per-neighbor force math, density-driven
  seekFallback   → the aggregate-grid reads
  avgNeighbors rising with n → density scaling, the 1000v1000 problem
`);
