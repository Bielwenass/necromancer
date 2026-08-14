import { beforeAll, describe, expect, test } from "bun:test";
import { simulateOffline } from "./catchupOffline";
import { TICK_MS, TICKS_PER_DAY } from "./data/pacing";
import { checkUnlockConditions } from "./rules/unlocks";
import {
	bannersEarned,
	bannersPaid,
	buildScenario,
	clearsById,
	runLive,
	totalClears,
	unlockedIds,
	worldOf,
} from "./testing/scenario";
import type { GameState } from "./types";

/**
 * The live tick and the offline catchup simulate the same game two ways — 100ms
 * steps versus jumps between events — sharing `advance` but not their sequencing.
 * Every seed is derived from persisted state, so agreement is whole-state
 * equality rather than a tolerance.
 */

const WINDOW = 4000; // ticks — several full dispatch cycles
const WINDOW_MS = WINDOW * TICK_MS;

/** No fight cache, so every fight is rolled from its own seed. */
const exact = { fightCache: false } as const;

describe("catchup determinism", () => {
	test("the same input gives the same state", async () => {
		const a = await simulateOffline(buildScenario(true), WINDOW_MS);
		const b = await simulateOffline(buildScenario(true), WINDOW_MS);
		expect(worldOf(a)).toEqual(worldOf(b));
		expect(totalClears(a)).toBeGreaterThan(0);
	});
});

describe("idle window", () => {
	let live: GameState;
	let off: GameState;

	beforeAll(async () => {
		live = runLive(buildScenario(false), WINDOW);
		off = await simulateOffline(buildScenario(false), WINDOW_MS);
	});

	// No fights means no randomness on either side, so passive income, day count
	// and the unlock sweep must land on identical numbers.
	test("passive income matches", () => {
		expect(live.resources.bones).toBeCloseTo(off.resources.bones, 6);
		expect(live.resources.souls).toBeCloseTo(off.resources.souls, 6);
		expect(live.resources.corpses).toBeCloseTo(off.resources.corpses, 6);
	});

	test("clocks match", () => {
		expect(live.meta.tickCount).toBe(off.meta.tickCount);
		expect(live.meta.dayCount).toBe(off.meta.dayCount);
		expect(live.meta.dayCount).toBe(
			Math.floor(live.meta.tickCount / TICKS_PER_DAY),
		);
	});

	test("the squad stays idle", () => {
		expect(live.squads[0].state).toBe("idle");
		expect(off.squads[0].state).toBe("idle");
	});
});

describe("fight window", () => {
	let live: GameState;
	let off: GameState;

	beforeAll(async () => {
		live = runLive(buildScenario(true), WINDOW);
		off = await simulateOffline(buildScenario(true), WINDOW_MS, exact);
	});

	test("both cleared the dungeon and kept their squad", () => {
		expect(live.squads).toHaveLength(1);
		expect(off.squads).toHaveLength(1);
		expect(totalClears(live)).toBeGreaterThan(0);
		expect(totalClears(off)).toBeGreaterThan(0);
	});

	test("the whole state matches", () => {
		expect(worldOf(live)).toEqual(worldOf(off));
	});

	test("banners = Σ tier × clears", () => {
		expect(bannersPaid(live)).toBe(bannersEarned(live));
		expect(bannersPaid(off)).toBe(bannersEarned(off));
	});

	test("unlocks agree with clears", () => {
		expect(
			unlockedIds({ ...live, dungeons: checkUnlockConditions(live.dungeons) }),
		).toEqual(unlockedIds(live));
		expect(
			unlockedIds({ ...off, dungeons: checkUnlockConditions(off.dungeons) }),
		).toEqual(unlockedIds(off));
		// The rule is pure, so equal clears must imply an equal unlock set.
		expect(clearsById(live)).toEqual(clearsById(off));
		expect(unlockedIds(live)).toEqual(unlockedIds(off));
	});
});

describe("resuming a window", () => {
	// Closing the tab mid-window and reopening it must not pay twice, skip a leg,
	// or lose a clear.
	test("offline then live equals one straight run", async () => {
		const whole = await simulateOffline(buildScenario(true), WINDOW_MS, exact);

		// Split mid-travel, off a squad's own deadline: the squad is on the road
		// with its deadline intact, so the live path picks the same trip up. A split
		// inside a fight is the one case that cannot resume, since the engine's
		// state is not in `GameState`.
		const split = buildScenario(true);
		const k = Math.floor((split.squads[0].phaseEndTick ?? 2) / 2);
		const first = await simulateOffline(split, k * TICK_MS, exact);

		expect(worldOf(runLive(first, WINDOW - k))).toEqual(worldOf(whole));
	});

	describe("a window ending mid-fight", () => {
		// Catchup runs the battle up front to know its length, but nothing may reach
		// the ledger until the tick the fight actually ends.
		let mid: GameState;

		beforeAll(async () => {
			const start = buildScenario(true);
			const arrival = start.squads[0].phaseEndTick ?? 0;
			mid = await simulateOffline(start, (arrival + 1) * TICK_MS, exact);
		});

		test("banks nothing early", () => {
			expect(mid.squads[0].state).toBe("fighting");
			expect(mid.squads[0].pendingLoot).toBeNull();
			expect(totalClears(mid)).toBe(0);
		});

		test("hands the fight over to the live path", () => {
			expect(mid.squads[0].fightSeed).toBeDefined();
			expect(mid.squads[0].phaseEndTick).toBeUndefined();
			expect(totalClears(runLive(mid, WINDOW))).toBeGreaterThan(0);
		});
	});
});

describe("travel timing", () => {
	// Stepping one tick at a time has to reach the dungeon on precisely the tick
	// the deadline names, or every trip drifts by one and the paths separate.
	const legs = buildScenario(true).squads[0].phaseEndTick ?? 0;

	test("still travelling one tick early", () => {
		expect(runLive(buildScenario(true), legs - 1).squads[0].state).toBe(
			"traveling",
		);
	});

	test("fighting on the deadline tick", () => {
		expect(runLive(buildScenario(true), legs).squads[0].state).toBe("fighting");
	});
});

describe("one squad per dungeon", () => {
	const idleCount = (s: GameState) =>
		s.squads.filter((sq) => sq.state === "idle").length;

	describe("two squads mustered on one dungeon", () => {
		// A legal pre-rule save. Both finish the trip they are already on, then
		// exactly one keeps the dungeon.
		let live: GameState;
		let off: GameState;

		beforeAll(async () => {
			live = runLive(buildScenario(true, 2), WINDOW);
			off = await simulateOffline(buildScenario(true, 2), WINDOW_MS);
		});

		test("exactly one squad is squeezed out", () => {
			expect(idleCount(live)).toBe(1);
			expect(idleCount(off)).toBe(1);
		});

		test("no dungeon has two holders", () => {
			for (const state of [live, off]) {
				const held = state.squads
					.filter((s) => s.state !== "idle" && s.targetDungeonId !== null)
					.map((s) => s.targetDungeonId);
				expect(new Set(held).size).toBe(held.length);
			}
		});
	});

	describe("a simultaneous arrival", () => {
		// Above, the two squads fight before they ever contend and differing fight
		// durations desynchronise them. Starting both on the return leg makes them
		// land on the same tick with no fight in between, which is the only way the
		// tie-break is reached.
		const bothReturning = () => {
			const s = buildScenario(true, 2);
			return {
				...s,
				squads: s.squads.map((sq) => ({
					...sq,
					state: "returning" as const,
					position: 1,
				})),
			};
		};
		const holderOf = (s: GameState) =>
			s.squads.find((sq) => sq.state !== "idle")?.id ?? "none";

		let live: GameState;
		let off: GameState;

		beforeAll(async () => {
			live = runLive(bothReturning(), 200);
			off = await simulateOffline(bothReturning(), 200 * TICK_MS);
		});

		test("leaves exactly one holder", () => {
			expect(idleCount(live)).toBe(1);
			expect(idleCount(off)).toBe(1);
		});

		test("breaks the tie for the earlier squad on both paths", () => {
			expect(holderOf(live)).toBe("S-01");
			expect(holderOf(off)).toBe("S-01");
		});
	});
});
