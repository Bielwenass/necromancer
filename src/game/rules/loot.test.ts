import { describe, expect, test } from "bun:test";
import { mulberry32 } from "../../combat/prng";
import { DUNGEON_DEFS } from "../data/dungeons";
import { buildScenario } from "../testing/scenario";
import { recomputeDerived } from "./derived";
import { generateLoot, projectLoot, shouldAutoDeploy } from "./loot";
import { makeDungeonState } from "./unlocks";

const def = DUNGEON_DEFS["paupers-tomb"];
const open = buildScenario(false).derived;
const shut = recomputeDerived({
	...buildScenario(false),
	upgrades: { purchased: [] },
});

describe("gated economies", () => {
	test("corpses and souls start locked", () => {
		expect(shut.corpsesUnlocked).toBe(false);
		expect(shut.soulsUnlocked).toBe(false);
	});

	test("a locked clear drops bones and nothing else", () => {
		const loot = generateLoot(def.id, 3, shut, mulberry32(7));
		expect(loot.corpses ?? 0).toBe(0);
		expect(loot.souls ?? 0).toBe(0);
		expect(loot.bones ?? 0).toBeGreaterThan(0);
		expect(projectLoot(def, 3, shut).corpses).toBe(0);
	});

	// Over many clears an opened economy must pay, or the gate reads as a
	// permanent lock.
	test("an opened economy pays corpses", () => {
		const rand = mulberry32(11);
		let corpses = 0;
		for (let i = 0; i < 200; i++) {
			corpses += generateLoot(def.id, 3, open, rand).corpses ?? 0;
		}
		expect(corpses).toBeGreaterThan(0);
	});
});

describe("auto-deploy", () => {
	const dungeon = makeDungeonState(def, true);
	const arriving = {
		composition: { skeleton: 5, zombie: 0, wraith: 0 },
		manualRecall: false,
		targetDungeonId: def.id,
	};

	test("fires when the dungeon is free", () => {
		expect(shouldAutoDeploy(open, arriving, dungeon, new Set())).toBe(true);
	});

	test("holds when the dungeon is taken", () => {
		expect(shouldAutoDeploy(open, arriving, dungeon, new Set([def.id]))).toBe(
			false,
		);
	});
});
