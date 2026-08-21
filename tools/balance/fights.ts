/**
 * Engine access for the harness: one fight, a seeded sweep of them, and the
 * WIN/AUTO thresholds a sweep is searched for. Nothing here assumes a build; it
 * runs whatever state it is handed through the real combat engine.
 */

import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
} from "../../src/combat/dungeonCombat";
import { CombatEngine } from "../../src/combat/engine";
import { ENGINE_DT, MAX_HEADLESS_TICKS } from "../../src/game/data/pacing";
import { UNDYING_TYPES, UNIT_TYPES } from "../../src/game/data/units";
import { dungeonEnemyCount } from "../../src/game/rules/loot";
import type {
	DungeonDef,
	GameState,
	SquadComposition,
} from "../../src/game/types";

/** Share of seeds a squad must win for the size to count as clearing. */
export const WIN_RATE = 0.9;

/** Mortal losses per clear a squad must stay under to run unattended. */
export const AUTO_LOSS = 0.5;

let fightsRun = 0;

/** Fights the process has run; the harness prints its own engine budget. */
export function fightCount(): number {
	return fightsRun;
}

export function comp(
	skeleton: number,
	zombie = 0,
	wraith = 0,
): SquadComposition {
	return { skeleton, zombie, wraith };
}

function mortalSize(c: SquadComposition): number {
	return UNIT_TYPES.filter((t) => !UNDYING_TYPES.has(t)).reduce(
		(n, t) => n + c[t],
		0,
	);
}

export interface FightResult {
	win: boolean;
	/** Units that will not come home. Undying losses are free, so excluded. */
	mortalLost: number;
	durationSec: number;
}

export function fight(
	c: SquadComposition,
	def: DungeonDef,
	state: GameState,
	seed: number,
): FightResult {
	fightsRun++;
	const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed });
	engine.setSide("a", buildAttackerConfig(c, state.derived));
	engine.setSide("b", buildDefenderConfig(def, state.derived));
	engine.start();

	let ticks = 0;
	while (engine.getWinner() === null && ticks < MAX_HEADLESS_TICKS) {
		engine.tick(ENGINE_DT);
		ticks++;
	}

	const win = engine.getWinner() === "a";
	const survivors = engine.getCounts().a;
	// Mirrors `compositionAfterFight`: the undying always reform.
	let home = 0;
	for (const type of UNIT_TYPES) {
		if (UNDYING_TYPES.has(type)) continue;
		home += win ? (survivors[type] ?? 0) : 0;
	}
	return {
		win,
		mortalLost: mortalSize(c) - home,
		durationSec: (ticks * ENGINE_DT) / 1000,
	};
}

export interface Sweep {
	winRate: number;
	mortalLost: number;
	durationSec: number;
}

export function sweep(
	c: SquadComposition,
	def: DungeonDef,
	state: GameState,
	seeds: number,
): Sweep {
	let wins = 0;
	let lost = 0;
	let secs = 0;
	for (let i = 0; i < seeds; i++) {
		const r = fight(c, def, state, 1_000_003 + i * 7919);
		if (r.win) wins++;
		lost += r.mortalLost;
		secs += r.durationSec;
	}
	return {
		winRate: wins / seeds,
		mortalLost: lost / seeds,
		durationSec: secs / seeds,
	};
}

/** Variance falls as the armies grow, so big fights get fewer seeds. */
export function seedsFor(n: number, def: DungeonDef): number {
	return n + dungeonEnemyCount(def) > 400 ? 3 : 5;
}

export function isAuto(s: Sweep): boolean {
	return s.winRate >= WIN_RATE && s.mortalLost < AUTO_LOSS;
}

export interface Thresholds {
	win: number | null;
	auto: number | null;
	durationSec: number;
}

/** Squad sizes are searched to this share of themselves, not to the unit. */
const RESOLUTION = 0.03;

export interface ThresholdOpts {
	/** Largest squad the search may field. */
	cap: number;
	/** Where the bracket opens, so a caller that knows the scale pays less. */
	hint?: number;
	/** Whether to go on and find AUTO, which costs about as much again. */
	auto?: boolean;
}

/**
 * Smallest squad clearing `>=WIN_RATE`, then the smallest clearing losslessly.
 * The bracket opens at `hint` and doubles or halves from there, and sweeps are
 * memoised, so the AUTO search reuses the sizes WIN already paid for. Both are
 * searched as if monotone, which they are only to within `RESOLUTION`.
 */
export function thresholds(
	def: DungeonDef,
	state: GameState,
	{ cap, hint = 2, auto = true }: ThresholdOpts,
): Thresholds {
	const seen = new Map<number, Sweep>();
	const at = (n: number): Sweep => {
		let s = seen.get(n);
		if (!s) {
			s = sweep(comp(n), def, state, seedsFor(n, def));
			seen.set(n, s);
		}
		return s;
	};

	/** Smallest size in `[floor, cap]` passing `ok`, bracketed out from `from`. */
	const smallest = (
		ok: (n: number) => boolean,
		from: number,
		floor = 1,
	): number | null => {
		// `lo` is the largest size known to fail, `hi` the smallest known to pass.
		let hi = Math.min(cap, Math.max(floor, Math.round(from)));
		let lo = floor - 1;
		if (ok(hi)) {
			while (hi > floor) {
				const half = Math.max(floor, Math.floor(hi / 2));
				if (half === hi) break;
				if (!ok(half)) {
					lo = half;
					break;
				}
				hi = half;
			}
		} else {
			lo = hi;
			while (hi < cap) {
				hi = Math.min(cap, hi * 2);
				if (ok(hi)) break;
				lo = hi;
			}
			if (!ok(hi)) return null;
		}

		while (hi - lo > Math.max(1, hi * RESOLUTION)) {
			const mid = (lo + hi) >> 1;
			if (mid === lo || mid === hi) break;
			if (ok(mid)) hi = mid;
			else lo = mid;
		}
		return hi;
	};

	const win = smallest((n) => at(n).winRate >= WIN_RATE, Math.max(2, hint));
	if (win === null || !auto) {
		return { win, auto: null, durationSec: 0 };
	}
	const clean = smallest((n) => isAuto(at(n)), cap, win);
	return {
		win,
		auto: clean,
		durationSec: clean === null ? 0 : at(clean).durationSec,
	};
}
