/**
 * What a squad is worth, measured instead of assumed.
 *
 * Two probes per tier, both on the real engine. Scale a dungeon's power and the
 * threshold squad moves: the slope of that is the exponent head count is paid
 * at. Scale the squad's stat line at the same dungeon and the threshold moves
 * again: that slope is the exchange rate between head count and stats. Together
 * they give `power = squad^alpha * (hp * dmg)^beta`, the only thing the
 * progression simulator uses to price one purchase against another.
 *
 * The curve is fitted three ways and the families are reported: the model rides
 * on the power family, so a run where log or linear describes the measured
 * points better is one whose exponent means less than it looks like it does.
 */

import { effectiveUnitStats } from "../../src/combat/dungeonCombat";
import { dungeonEnemyCount } from "../../src/game/rules/loot";
import type { DungeonDef, GameState } from "../../src/game/types";
import { comp, seedsFor, sweep, thresholds, WIN_RATE } from "./fights";
import { probeState } from "./state";

/** Head counts a probe squad is held between; a tiny squad has no resolution. */
const PROBE_MIN = 24;
const PROBE_MAX = 400;

const POWER_MULTS = [0.125, 0.25, 0.5, 1, 2, 4];
const STAT_MULTS = [0.35, 0.6, 1, 1.7, 3];

/** Stat multipliers the probe search is bracketed by, and its resolution. */
const MULT_CEILING = 4096;
const MULT_FLOOR = 1 / 64;
const MULT_RESOLUTION = 1.15;

/** Head room over the probe squad, so a scaled-up dungeon still has a threshold. */
const PROBE_CAP = 12;

/** Spread across tiers past which one exponent stops describing all of them. */
const ALPHA_SPREAD = 0.25;

export function enemyPower(def: DungeonDef): number {
	let hp = 0;
	let dps = 0;
	for (const e of def.enemies) {
		hp += e.amount * e.stats.hp;
		dps += e.amount * e.stats.dmg;
	}
	return hp * dps;
}

/** The squad's own stat line, the second axis of the model. */
export function statPower(state: GameState): number {
	const s = effectiveUnitStats(state.derived, "skeleton");
	return s.hp * s.dmg;
}

/** Power is HP by damage, so each carries half of a change to it. */
function scaledDungeon(def: DungeonDef, powerMult: number): DungeonDef {
	const k = Math.sqrt(powerMult);
	return {
		...def,
		enemies: def.enemies.map((e) => ({
			...e,
			stats: { ...e.stats, hp: e.stats.hp * k, dmg: e.stats.dmg * k },
		})),
	};
}

export interface Point {
	x: number;
	n: number;
}

export type FitName = "power" | "log" | "linear";

export interface Fit {
	name: FitName;
	slope: number;
	intercept: number;
	/** Root mean square residual in log squad size, so families compare. */
	rmse: number;
}

function line(
	xs: number[],
	ys: number[],
): { slope: number; intercept: number } {
	const n = xs.length;
	const mx = xs.reduce((a, b) => a + b, 0) / n;
	const my = ys.reduce((a, b) => a + b, 0) / n;
	let num = 0;
	let den = 0;
	for (let i = 0; i < n; i++) {
		num += (xs[i] - mx) * (ys[i] - my);
		den += (xs[i] - mx) ** 2;
	}
	const slope = den === 0 ? 0 : num / den;
	return { slope, intercept: my - slope * mx };
}

function residual(points: Point[], predict: (x: number) => number): number {
	let sum = 0;
	for (const p of points) {
		const guess = predict(p.x);
		if (!(guess > 0)) return Number.POSITIVE_INFINITY;
		sum += (Math.log(guess) - Math.log(p.n)) ** 2;
	}
	return Math.sqrt(sum / points.length);
}

/** The three families, best fit first. */
export function fitFamilies(points: Point[]): Fit[] {
	const lx = points.map((p) => Math.log(p.x));
	const ln = points.map((p) => Math.log(p.n));
	const n = points.map((p) => p.n);
	const x = points.map((p) => p.x);

	const power = line(lx, ln);
	const log = line(lx, n);
	const linear = line(x, n);

	const fits: Fit[] = [
		{
			name: "power",
			...power,
			rmse: residual(points, (v) =>
				Math.exp(power.intercept + power.slope * Math.log(v)),
			),
		},
		{
			name: "log",
			...log,
			rmse: residual(points, (v) => log.intercept + log.slope * Math.log(v)),
		},
		{
			name: "linear",
			...linear,
			rmse: residual(points, (v) => linear.intercept + linear.slope * v),
		},
	];
	return fits.sort((a, b) => a.rmse - b.rmse);
}

export interface TierScaling {
	tier: number;
	def: DungeonDef;
	probeSquad: number;
	probeMult: number;
	/** `power ∝ squad^alpha` at the probed scale. */
	alpha: number;
	/** `power ∝ (hp * dmg)^beta`. */
	beta: number;
	powerPoints: Point[];
	statPoints: Point[];
	powerFits: Fit[];
	statFits: Fit[];
}

/**
 * Stat multiplier at which `squad` is exactly the threshold squad, so the sweeps
 * that follow are centred on a head count worth reading off.
 */
function probeMult(def: DungeonDef, squad: number): number | null {
	const clears = (mult: number) =>
		sweep(comp(squad), def, probeState(mult), seedsFor(squad, def)).winRate >=
		WIN_RATE;

	let lo = 1;
	let hi = 1;
	if (clears(1)) {
		while (lo > MULT_FLOOR && clears(lo)) {
			hi = lo;
			lo /= 2;
		}
		if (lo <= MULT_FLOOR) return MULT_FLOOR;
	} else {
		while (hi < MULT_CEILING && !clears(hi)) {
			lo = hi;
			hi *= 2;
		}
		if (hi >= MULT_CEILING) return null;
	}

	while (hi / lo > MULT_RESOLUTION) {
		const mid = Math.sqrt(lo * hi);
		if (clears(mid)) hi = mid;
		else lo = mid;
	}
	return hi;
}

/** The tier's middle dungeon by power, its plainest reading of the ladder. */
export function referenceDungeon(defs: DungeonDef[]): DungeonDef {
	const sorted = [...defs].sort((a, b) => enemyPower(a) - enemyPower(b));
	return sorted[Math.floor((sorted.length - 1) / 2)];
}

export function measureTier(
	tier: number,
	defs: DungeonDef[],
): TierScaling | null {
	const def = referenceDungeon(defs);
	const probeSquad = Math.min(
		PROBE_MAX,
		Math.max(PROBE_MIN, dungeonEnemyCount(def)),
	);
	const mult = probeMult(def, probeSquad);
	if (mult === null) return null;

	const state = probeState(mult);
	const cap = probeSquad * PROBE_CAP;

	// The probe squad is the threshold at ×1, so it brackets every other point.
	// Only WIN is wanted here: what a squad is worth does not depend on losses.
	const opts = { cap, hint: probeSquad, auto: false };
	const powerPoints: Point[] = [];
	for (const m of POWER_MULTS) {
		const t = thresholds(scaledDungeon(def, m), state, opts);
		if (t.win !== null) powerPoints.push({ x: m, n: t.win });
	}

	const statPoints: Point[] = [];
	for (const k of STAT_MULTS) {
		const t = thresholds(def, probeState(mult * k), opts);
		if (t.win !== null) statPoints.push({ x: k, n: t.win });
	}
	if (powerPoints.length < 3 || statPoints.length < 3) return null;

	const powerFits = fitFamilies(powerPoints);
	const statFits = fitFamilies(statPoints);
	const alpha = 1 / (powerFits.find((f) => f.name === "power")?.slope ?? 1);
	// Both stats move together, so the stat line carries twice the multiplier.
	const statSlope = statFits.find((f) => f.name === "power")?.slope ?? -1;
	const beta = (alpha * -statSlope) / 2;

	return {
		tier,
		def,
		probeSquad,
		probeMult: mult,
		alpha,
		beta,
		powerPoints,
		statPoints,
		powerFits,
		statFits,
	};
}

export interface PowerModel {
	scalings: TierScaling[];
	/** Whether one exponent covers every tier measured. */
	universal: boolean;
	alpha(tier: number): number;
	beta: number;
	/** Where a build and a head count land on the difficulty axis. */
	power(state: GameState, squad: number, tier: number): number;
}

export function buildModel(scalings: TierScaling[]): PowerModel {
	const alphas = scalings.map((s) => s.alpha);
	const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
	const pooled = mean(alphas);
	const universal = Math.max(...alphas) - Math.min(...alphas) <= ALPHA_SPREAD;
	const beta = mean(scalings.map((s) => s.beta));
	const byTier = new Map(scalings.map((s) => [s.tier, s.alpha]));

	const alpha = (tier: number) =>
		universal ? pooled : (byTier.get(tier) ?? pooled);

	return {
		scalings,
		universal,
		alpha,
		beta,
		power: (state, squad, tier) =>
			squad ** alpha(tier) * statPower(state) ** beta,
	};
}
