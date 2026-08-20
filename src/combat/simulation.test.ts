import { describe, expect, test } from "bun:test";
import { COMBAT_CONFIG } from "./config";
import { EventQueue } from "./events";
import { mulberry32 } from "./prng";
import {
	createSimState,
	finalizeSpawn,
	type SimState,
	spawnUnits,
	tickSimulation,
} from "./simulation";
import { SIDE_A, type SideConfig } from "./types";

const W = 200;
const H = 100;

function side(count: number, left: boolean, reach?: number): SideConfig {
	return {
		units: [
			{
				name: left ? "skeleton" : "ghoul",
				amount: count,
				stats: { hp: 20, dmg: 6, speed: 1, reach },
				color: "white",
			},
		],
		spawnArea: { x: left ? 10 : W - 40, y: 10, w: 30, h: H - 20 },
	};
}

function build(reach?: number): SimState {
	const state = createSimState();
	const rand = mulberry32(7);
	const next = spawnUnits(state, side(20, true, reach), "a", 1, rand);
	spawnUnits(state, side(20, false), "b", next, rand);
	finalizeSpawn(state, rand);
	return state;
}

/** Every invariant the id-held target rests on, checked after each tick. */
function checkTargets(state: SimState): void {
	const u = state.units;
	for (let i = 0; i < u.count; i++) {
		expect(state.slotOfId[u.id[i]]).toBe(i);
		const slot = state.slotOfId[u.targetId[i]];
		if (u.targetId[i] === 0) continue;
		expect(slot).toBeGreaterThanOrEqual(-1);
		if (slot >= 0) expect(u.side[slot]).not.toBe(u.side[i]);
	}
}

describe("held targets", () => {
	test("never outlive the unit they point at", () => {
		const state = build();
		const events = new EventQueue();
		for (let n = 1; n <= 400; n++) {
			tickSimulation(state, 0.016, events, n * 16, W, H);
			checkTargets(state);
		}
		expect(state.units.count).toBeLessThan(40);
	});

	test("hold through the swap-remove that fills a dead slot", () => {
		const state = build();
		const events = new EventQueue();
		let deaths = 0;
		for (let n = 1; n <= 600; n++) {
			const before = state.units.count;
			tickSimulation(state, 0.016, events, n * 16, W, H);
			deaths += before - state.units.count;
		}
		expect(deaths).toBeGreaterThan(0);
		checkTargets(state);
	});
});

test("a longer reach strikes sooner than one that has to close", () => {
	const events = new EventQueue();
	// The tick of the first kill, which is when the reach first mattered.
	const firstKill = (state: SimState) => {
		for (let n = 1; n <= 1000; n++) {
			if (tickSimulation(state, 0.016, events, n * 16, W, H).b < 20) return n;
		}
		return Number.POSITIVE_INFINITY;
	};
	const melee = firstKill(build());
	const ranged = firstKill(build(COMBAT_CONFIG.simulation.attackRadius * 4));
	expect(ranged).toBeLessThan(melee);
});

test("blows are not banked against a body", () => {
	// One side outnumbers the other far enough that overkill would be the norm.
	const state = createSimState();
	const rand = mulberry32(3);
	const next = spawnUnits(state, side(30, true), "a", 1, rand);
	spawnUnits(state, side(1, false), "b", next, rand);
	finalizeSpawn(state, rand);
	const events = new EventQueue();

	let liveA = 0;
	for (let n = 1; n <= 600; n++) {
		const counts = tickSimulation(state, 0.016, events, n * 16, W, H);
		liveA = counts.a;
		if (counts.b === 0) break;
	}
	// The lone defender dies and takes nobody with it, so no attacker spent a swing
	// on a corpse while the fight was still on.
	expect(liveA).toBe(30);
	expect(state.units.count).toBe(30);
	for (let i = 0; i < state.units.count; i++) {
		expect(state.units.side[i]).toBe(SIDE_A);
	}
});
