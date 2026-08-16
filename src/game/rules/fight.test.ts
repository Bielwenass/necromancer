import { describe, expect, test } from "bun:test";
import { mulberry32 } from "../../combat/prng";
import { DUNGEON_DEFS } from "../data/dungeons";
import { buildScenario } from "../testing/scenario";
import { resolveFightOutcome } from "./fight";
import { emptyComposition } from "./units";

const def = DUNGEON_DEFS["paupers-tomb"];
const derived = buildScenario(false).derived;
const before = { skeleton: 10, zombie: 2, wraith: 3 };

describe("a clear", () => {
	const win = {
		winner: "a" as const,
		survivorsByType: { skeleton: 7, zombie: 1, wraith: 0 },
	};
	const res = resolveFightOutcome(before, def, 4, win, derived, mulberry32(99));

	test("reproduces from the same seed", () => {
		expect(
			resolveFightOutcome(before, def, 4, win, derived, mulberry32(99)),
		).toEqual(res);
	});

	test("counts and pays banners with the loot", () => {
		expect(res.kind).toBe("cleared");
		expect(res.loot?.banners).toBe(def.tier);
	});

	test("keeps losses but reforms wraiths", () => {
		expect(res.composition.skeleton).toBe(7);
		expect(res.composition.wraith).toBe(before.wraith);
	});
});

describe("a wipe", () => {
	const res = resolveFightOutcome(
		before,
		def,
		4,
		{ winner: "b", survivorsByType: emptyComposition() },
		derived,
		mulberry32(99),
	);

	test("pays nothing and doesn't count", () => {
		expect(res.loot).toBeNull();
		expect(res.kind).not.toBe("cleared");
	});

	test("leaves only the undying", () => {
		expect(res.composition.wraith).toBe(3);
		expect(res.composition.skeleton).toBe(0);
	});

	test("suppresses auto-deploy", () => {
		expect(res.suppressAutoDeploy).toBe(true);
	});

	test("destroys a squad with nothing undying", () => {
		const total = resolveFightOutcome(
			{ skeleton: 5, zombie: 0, wraith: 0 },
			def,
			0,
			{ winner: "b", survivorsByType: emptyComposition() },
			derived,
			mulberry32(1),
		);
		expect(total.kind).toBe("destroyed");
	});
});

test("reanimation never exceeds max squad size", () => {
	const greedy = { ...derived, reanimateChance: 1, maxSquadSize: 12 };
	const res = resolveFightOutcome(
		{ skeleton: 20, zombie: 0, wraith: 0 },
		def,
		0,
		{ winner: "a", survivorsByType: { skeleton: 8, zombie: 0, wraith: 0 } },
		greedy,
		mulberry32(3),
	);
	expect(res.composition.skeleton).toBe(12);
});
