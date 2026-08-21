/**
 * TEMPORARY probe: how much of a unit's motion at contact is oscillation.
 *
 * `reversalPct` is the share of ticks where velocity turned more than 90 deg.
 * `pathRatio` is distance walked over net displacement across a 20-tick window:
 * 1 is a straight line, high is buzzing in place.
 */

import {
	ATTACKER_SPAWN,
	COMBAT_H,
	COMBAT_W,
	DEFENDER_SPAWN,
} from "../../src/combat/dungeonCombat";
import { CombatEngine } from "../../src/combat/engine";
import type { SideConfig, SimUnits } from "../../src/combat/types";
import { ENGINE_DT, MAX_HEADLESS_TICKS } from "../../src/game/data/pacing";
import { UNIT_STAT_CONFIG } from "../../src/game/data/units";

const SKELETON = UNIT_STAT_CONFIG.skeleton;
const MEASURE_FROM = 100; // ticks: skip the approach, measure the melee
const WINDOW = 20;

function makeConfig(count: number, leftSide: boolean): SideConfig {
	return {
		units: [
			{
				name: "skeleton",
				amount: count,
				// Fat HP so the fight lasts long enough to measure the crush.
				stats: {
					hp: SKELETON.hp.base * 8,
					dmg: SKELETON.dmg.base,
					speed: SKELETON.speed.base,
				},
				color: "white",
			},
		],
		spawnArea: leftSide ? ATTACKER_SPAWN : DEFENDER_SPAWN,
	};
}

function run(n: number, seed: number) {
	const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed });
	engine.setSide("a", makeConfig(n, true));
	engine.setSide("b", makeConfig(n, false));
	engine.start();
	// biome-ignore lint/suspicious/noExplicitAny: probe reads private sim state
	const units = () => (engine as any).simState.units as SimUnits;

	const prevV = new Map<number, { vx: number; vy: number }>();
	const prevP = new Map<number, { x: number; y: number }>();
	const win = new Map<
		number,
		{ x0: number; y0: number; walked: number; k: number }
	>();

	let reversals = 0;
	let samples = 0;
	let speedSum = 0;
	let pathSum = 0;
	let pathN = 0;
	let ticks = 0;
	// Collision displacement: phase 3 moves positions without touching velocity,
	// so (actual delta - velocity delta) isolates exactly what it shoved.
	let collSum = 0;
	let intSum = 0;
	let collN = 0;

	while (engine.getWinner() === null && ticks < MAX_HEADLESS_TICKS) {
		engine.tick(ENGINE_DT);
		ticks++;
		const u = units();
		// Brute-force contact flags: O(n^2), but this is a probe, not the game.
		const engaged = new Set<number>();
		for (let i = 0; i < u.count; i++) {
			for (let j = i + 1; j < u.count; j++) {
				if (u.side[i] === u.side[j]) continue;
				const dx = u.x[i] - u.x[j];
				const dy = u.y[i] - u.y[j];
				if (dx * dx + dy * dy < 36) {
					engaged.add(u.id[i]);
					engaged.add(u.id[j]);
				}
			}
		}
		for (let i = 0; i < u.count; i++) {
			const id = u.id[i];
			const x = u.x[i];
			const y = u.y[i];
			const vx = u.vx[i];
			const vy = u.vy[i];
			if (ticks >= MEASURE_FROM && !engaged.has(id)) {
				prevV.set(id, { vx, vy });
				prevP.set(id, { x, y });
				win.set(id, { x0: x, y0: y, walked: 0, k: 0 });
				continue;
			}
			const pv = prevV.get(id);
			const pp = prevP.get(id);
			prevV.set(id, { vx, vy });
			prevP.set(id, { x, y });

			if (ticks < MEASURE_FROM || !pv || !pp) {
				win.set(id, { x0: x, y0: y, walked: 0, k: 0 });
				continue;
			}

			const m1 = Math.hypot(pv.vx, pv.vy);
			const m2 = Math.hypot(vx, vy);
			if (m1 > 0.5 && m2 > 0.5) {
				samples++;
				speedSum += m2;
				if ((pv.vx * vx + pv.vy * vy) / (m1 * m2) < 0) reversals++;
			}

			const dt = ENGINE_DT / 1000;
			collSum += Math.hypot(x - pp.x - vx * dt, y - pp.y - vy * dt);
			intSum += Math.hypot(vx * dt, vy * dt);
			collN++;

			const w = win.get(id);
			if (!w) continue;
			w.walked += Math.hypot(x - pp.x, y - pp.y);
			w.k++;
			if (w.k >= WINDOW) {
				const net = Math.hypot(x - w.x0, y - w.y0);
				if (w.walked > 0.5) {
					pathSum += w.walked / Math.max(net, 0.05);
					pathN++;
				}
				win.set(id, { x0: x, y0: y, walked: 0, k: 0 });
			}
		}
	}

	return {
		ticks,
		reversalPct: samples > 0 ? (reversals / samples) * 100 : 0,
		pathRatio: pathN > 0 ? pathSum / pathN : 0,
		avgSpeed: samples > 0 ? speedSum / samples : 0,
		collPx: collN > 0 ? collSum / collN : 0,
		intPx: collN > 0 ? intSum / collN : 0,
		wallMs: engine.stats.wallTimeMs,
		perTickMs: engine.stats.wallTimeMs / Math.max(1, engine.stats.numTicks),
	};
}

for (const n of [20, 100]) {
	const rs = [0xcafe, 0xbeef, 0xf00d].map((s) => run(n, s));
	const avg = (f: (r: (typeof rs)[0]) => number) =>
		rs.reduce((a, r) => a + f(r), 0) / rs.length;
	console.log(
		`${n}v${n}: ticks ${avg((r) => r.ticks)
			.toFixed(0)
			.padStart(5)}  reversal ${avg((r) => r.reversalPct)
			.toFixed(1)
			.padStart(5)}%  pathRatio ${avg((r) => r.pathRatio)
			.toFixed(2)
			.padStart(6)}  speed ${avg((r) => r.avgSpeed)
			.toFixed(1)
			.padStart(
				5,
			)}px/s  move/tick: integrate ${avg((r) => r.intPx).toFixed(3)}px vs collision ${avg((r) => r.collPx).toFixed(3)}px  ${avg((r) => r.perTickMs).toFixed(3)}ms/tick`,
	);
}
