/**
 * Headless combat benchmark. `bunx tsx src/combat/benchmark.ts`.
 *
 * Both sides are level-zero skeletons in the real spawn bands: a symmetric worst
 * case. Read the phase split; the absolutes mean little.
 *
 * `bunx tsx src/combat/benchmark.ts sweep` instead walks every numeric leaf of
 * COMBAT_CONFIG at 0.1x and 10x, one at a time, to price each dial.
 */

import {
	ATTACKER_SPAWN,
	COMBAT_H,
	COMBAT_W,
	DEFENDER_SPAWN,
} from "../../src/combat/dungeonCombat";
import { CombatEngine } from "../../src/combat/engine";
import type { SideConfig, UnitMods } from "../../src/combat/types";
import { ENGINE_DT, MAX_HEADLESS_TICKS } from "../../src/game/data/pacing";
import { UNIT_STAT_CONFIG } from "../../src/game/data/units";
import { type ConfigDial, combatDials } from "../dials";

const SKELETON = UNIT_STAT_CONFIG.skeleton;

const NO_MODS: UnitMods = {
	lifesteal: 0,
	regen: 0,
	berserk: 0,
	revive: 0,
	vanguard: 0,
	overwhelm: 0,
	executioner: 0,
	spectral: 0,
	lastStand: 0,
};

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

const SCENARIOS = [100, 250, 500, 1000, 2000];
const SEEDS = [0xcafe, 0xbeef, 0xf00d];

interface RunLimits {
	maxTicks: number;
	/** Wall budget; a pathological config would otherwise run for minutes. */
	maxWallMs: number;
}

const NO_LIMITS: RunLimits = {
	maxTicks: MAX_HEADLESS_TICKS,
	maxWallMs: Number.POSITIVE_INFINITY,
};

interface RunResult {
	n: number;
	ticks: number;
	wallMs: number;
	perTickMs: number;
	/** The fight was cut short, so `ticks` is a floor and the blob never peaked. */
	cutShort: boolean;

	// phase percentages of the whole frame
	gridPct: number;
	accelPct: number;
	damagePct: number;

	// grid build percentages of the build total
	finePct: number;
	cellPct: number;

	// accel sub-phase percentages, zero unless `detail` timing was on
	neighborPct: number;
	seekPct: number;
	integratePct: number;

	// Work per unit-tick: candidates the 3x3 walks reached, and how many of those
	// were inside the radius and did something.
	avgNeighbors: number;
	maxNeighbors: number;
	sepPairs: number;
	collPairs: number;
	/** Mean overlap as a share of the collision radius, before it is pushed out. */
	depth: number;
	engagedShare: number;
	meleeSpeed: number;
	acquisitions: number;
	acquireScan: number;
	contactSwaps: number;
	swings: number;
}

function runOnce(
	n: number,
	seed: number,
	mods?: UnitMods,
	limits: RunLimits = NO_LIMITS,
	stats: "phase" | "detail" = "phase",
): RunResult {
	const engine = new CombatEngine({
		width: COMBAT_W,
		height: COMBAT_H,
		seed,
		stats,
	});
	// Side A only: enemies never carry modifiers.
	engine.setSide("a", makeConfig(n, true, mods));
	engine.setSide("b", makeConfig(n, false));
	engine.start();

	const wallStart = performance.now();
	while (
		engine.getWinner() === null &&
		engine.stats.numTicks < limits.maxTicks &&
		performance.now() - wallStart < limits.maxWallMs
	) {
		engine.tick(ENGINE_DT);
	}

	const s = engine.stats;
	const phaseTotal = s.gridBuildMs + s.accelMs + s.damageMs;
	const accelTotal = s.neighborMs + s.seekMs + s.integrateMs;
	const buildTotal = s.fineBuildMs + s.cellBuildMs;
	const pct = (ms: number, base: number) => (base > 0 ? (ms / base) * 100 : 0);
	// Per unit-tick, so the numbers compare across scenario sizes.
	const per = (v: number) => (s.unitsProcessed > 0 ? v / s.unitsProcessed : 0);

	return {
		n,
		ticks: s.numTicks,
		wallMs: s.wallTimeMs,
		perTickMs: s.numTicks > 0 ? s.wallTimeMs / s.numTicks : 0,
		cutShort: engine.getWinner() === null,
		gridPct: pct(s.gridBuildMs, phaseTotal),
		accelPct: pct(s.accelMs, phaseTotal),
		damagePct: pct(s.damageMs, phaseTotal),
		finePct: pct(s.fineBuildMs, buildTotal),
		cellPct: pct(s.cellBuildMs, buildTotal),
		neighborPct: pct(s.neighborMs, accelTotal),
		seekPct: pct(s.seekMs, accelTotal),
		integratePct: pct(s.integrateMs, accelTotal),
		avgNeighbors: per(s.neighborsVisited),
		maxNeighbors: s.maxNeighbors,
		sepPairs: per(s.separationPairs),
		collPairs: per(s.collisionPairs),
		depth: s.collisionPairs > 0 ? s.overlapDepth / s.collisionPairs : 0,
		engagedShare: per(s.engagedUnits),
		meleeSpeed: s.engagedUnits > 0 ? s.engagedSpeed / s.engagedUnits : 0,
		acquisitions: per(s.acquisitions),
		acquireScan: per(s.acquireScanned),
		contactSwaps: per(s.contactSwaps),
		swings: per(s.swings),
	};
}

const hitRate = (hits: number, seen: number) =>
	`${seen > 0 ? ((hits / seen) * 100).toFixed(0) : "0"}%`;

/** `detailed` is one run apart: its per-unit timers inflate every other number. */
function summarize(results: RunResult[], detailed: RunResult): void {
	const n = results[0].n;
	const avg = (f: (r: RunResult) => number) =>
		results.reduce((s, r) => s + f(r), 0) / results.length;

	console.log(`\n── ${n}v${n} (avg over ${results.length} seeds) ──`);
	console.log(`  ticks:        ${avg((r) => r.ticks).toFixed(0)}`);
	console.log(`  per tick:     ${avg((r) => r.perTickMs).toFixed(3)}ms`);
	console.log(`  total duration: ${avg((r) => r.wallMs).toFixed(0)}ms`);
	console.log(
		`  phase split:  grid ${avg((r) => r.gridPct).toFixed(0)}%  accel ${avg((r) => r.accelPct).toFixed(0)}%  damage ${avg((r) => r.damagePct).toFixed(0)}%`,
	);
	console.log(
		`  grid split:   contact ${avg((r) => r.finePct).toFixed(0)}%  steer ${avg((r) => r.cellPct).toFixed(0)}%`,
	);
	console.log(
		`  accel split:  neighbors ${detailed.neighborPct.toFixed(0)}%  target+seek ${detailed.seekPct.toFixed(0)}%  integrate ${detailed.integratePct.toFixed(0)}%`,
	);
	console.log(
		`  the walk:     ${avg((r) => r.avgNeighbors).toFixed(1)} seen → ${avg((r) => r.sepPairs).toFixed(1)} pushed (${hitRate(
			avg((r) => r.sepPairs),
			avg((r) => r.avgNeighbors),
		)}), ${avg((r) => r.collPairs).toFixed(2)} in contact @${(avg((r) => r.depth) * 100).toFixed(0)}% deep  max seen ${avg((r) => r.maxNeighbors).toFixed(0)}`,
	);
	console.log(
		`  targeting:    ${avg((r) => r.acquisitions).toFixed(3)} picks/unit-tick over ${avg((r) => r.acquireScan).toFixed(1)} scanned  ${avg((r) => r.contactSwaps).toFixed(3)} contact swaps`,
	);
	console.log(
		`  melee:        ${(avg((r) => r.engagedShare) * 100).toFixed(0)}% engaged at ${avg((r) => r.meleeSpeed).toFixed(1)}px/s, ${avg((r) => r.swings).toFixed(3)} swings/unit-tick`,
	);
}

// ── config sweep ────────────────────────────────────────────────

const SWEEP_N = 250;
const SWEEP_SEEDS = [0xcafe, 0xbeef];
const SWEEP_FACTORS = [0.1, 10];
const SWEEP_LIMITS: RunLimits = { maxTicks: 5000, maxWallMs: 30_000 };

/** A `modifiers.*` dial is dead weight unless the loadout switches it on. */
const SWEEP_MODS: UnitMods = {
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
};

function sweepRun(mods?: UnitMods): RunResult {
	const runs = SWEEP_SEEDS.map((seed) =>
		runOnce(SWEEP_N, seed, mods, SWEEP_LIMITS),
	);
	const avg = (f: (r: RunResult) => number) =>
		runs.reduce((s, r) => s + f(r), 0) / runs.length;
	return {
		...runs[0],
		ticks: avg((r) => r.ticks),
		wallMs: avg((r) => r.wallMs),
		perTickMs: avg((r) => r.perTickMs),
		cutShort: runs.some((r) => r.cutShort),
		avgNeighbors: avg((r) => r.avgNeighbors),
	};
}

const pctOf = (v: number, base: number) => {
	const d = ((v - base) / base) * 100;
	return `${d >= 0 ? "+" : ""}${d.toFixed(0)}%`;
};

function cell(r: RunResult, base: RunResult): string {
	// The whole fight is the headless cost: a dial can pay for a dearer tick by
	// deciding sooner. Meaningless once a run is cut short.
	const fight = r.cutShort
		? "  cut".padStart(11)
		: `${(r.wallMs / 1000).toFixed(1)}s ${pctOf(r.wallMs, base.wallMs)}`.padStart(
				11,
			);
	return `${r.perTickMs.toFixed(3)}ms ${pctOf(r.perTickMs, base.perTickMs).padStart(6)}${r.cutShort ? "!" : " "}${fight} ${`${r.ticks.toFixed(0)}t`.padStart(6)} ${`${r.avgNeighbors.toFixed(1)}n`.padStart(7)}`;
}

function runSweep(): void {
	console.log(`Combat config sweep — ${SWEEP_N}v${SWEEP_N}, no modifiers`);
	console.log(
		`Board: ${COMBAT_W}×${COMBAT_H}, ${SWEEP_SEEDS.length} seeds, cap ${SWEEP_LIMITS.maxTicks} ticks / ${SWEEP_LIMITS.maxWallMs}ms per run`,
	);

	runOnce(50, 0); // warm-up
	const baseline = sweepRun();
	const modBaseline = sweepRun(SWEEP_MODS);
	const describe = (r: RunResult) =>
		`${r.perTickMs.toFixed(3)}ms/tick  ${r.ticks.toFixed(0)} ticks  ${(r.wallMs / 1000).toFixed(1)}s/fight  ${r.avgNeighbors.toFixed(1)} neighbors/unit`;
	console.log(`\nbaseline (1x):        ${describe(baseline)}`);
	console.log(`baseline (1x, mods*): ${describe(modBaseline)}`);

	const dials = combatDials();
	const rows: { dial: ConfigDial; runs: RunResult[]; base: RunResult }[] = [];
	for (const dial of dials) {
		const mods = dial.path.startsWith("modifiers.") ? SWEEP_MODS : undefined;
		const runs: RunResult[] = [];
		for (const factor of SWEEP_FACTORS) {
			dial.set(dial.value * factor);
			runs.push(sweepRun(mods));
		}
		dial.set(dial.value);
		rows.push({ dial, runs, base: mods ? modBaseline : baseline });
		process.stderr.write(`  measured ${dial.path}\n`);
	}

	// Loudest dial first; a flat row is a value the loop never reads.
	const swing = (r: { runs: RunResult[]; base: RunResult }) =>
		Math.max(...r.runs.map((x) => Math.abs(x.perTickMs - r.base.perTickMs)));
	rows.sort((a, b) => swing(b) - swing(a));

	console.log(
		`\n${"dial".padEnd(34)}${"1x".padEnd(9)}${SWEEP_FACTORS.map((f) => `${f}x`.padEnd(44)).join("")}`,
	);
	for (const { dial, runs, base } of rows) {
		const label = base === modBaseline ? `${dial.path}*` : dial.path;
		const cells = runs.map((r) => cell(r, base).padEnd(44));
		console.log(
			`${label.padEnd(34)}${String(dial.value).padEnd(9)}${cells.join("")}`,
		);
	}

	// The same config again: everything between is only readable above this drift.
	const recheck = sweepRun();
	console.log(`
Columns: ms/tick (Δ), whole fight (Δ), ticks to decide it, neighbors/unit.
  ! → hit the tick or wall cap; ms/tick misses the peak blob and reads low.
  * → measured against the modifier baseline, the only one that reads the dial.
  A flat row is a dial the headless loop never reads.
  noise floor: baseline re-measured at the end came out ${pctOf(recheck.perTickMs, baseline.perTickMs)}.
`);
}

function runScenarios(): void {
	console.log("Combat benchmark — accel sub-phase breakdown");
	console.log(`Board: ${COMBAT_W}×${COMBAT_H}, step: 16ms`);

	runOnce(50, 0); // warm-up

	for (const n of SCENARIOS) {
		const results: RunResult[] = [];
		for (const seed of SEEDS) results.push(runOnce(n, seed));
		const detailed = runOnce(n, SEEDS[0], undefined, NO_LIMITS, "detail");
		summarize(results, detailed);
	}

	// Every modifier rides along in loops that already run.
	console.log("\n── modifier cost, 500v500 (avg over 3 seeds) ──");
	for (const { label, mods } of MOD_LOADOUTS) {
		const runs = SEEDS.map((seed) => runOnce(500, seed, mods));
		const perTick = runs.reduce((s, r) => s + r.perTickMs, 0) / runs.length;
		const neighbors =
			runs.reduce((s, r) => s + r.avgNeighbors, 0) / runs.length;
		console.log(
			`  ${label.padEnd(20)} ${perTick.toFixed(3)}ms/tick   neighbors ${neighbors.toFixed(1)}/unit`,
		);
	}

	console.log(`
Reading the output:
  phase split    → both grid builds, then steering, contact and integration,
                   then damage
  accel split    → measured in a separate 'detail' run; its per-unit timers would
                   otherwise inflate every timing above it
  seen → pushed  → candidates the one 3x3 block walk reached, then those inside
                   separationRadius. A low hit rate means the block is bigger
                   than the query. Contact pairs ride the same distances
  targeting      → per unit-tick; picks are the cell scans, swaps are held targets
                   dropped for one in contact
  melee          → what engagedDamping and velocityAbsorb are for: a settled
                   contact carries little speed and overlaps shallowly
`);
}

if (process.argv[2] === "sweep") runSweep();
else runScenarios();
