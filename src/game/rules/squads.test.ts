import { expect, test } from "bun:test";
import type { Squad } from "../types";
import { dungeonOccupancy } from "./squads";

const held = (state: Squad["state"], target: string | null) => ({
	id: "S-01",
	state,
	targetDungeonId: target,
});

test("travelling, fighting and returning all hold the dungeon", () => {
	for (const state of ["traveling", "fighting", "returning"] as const) {
		expect(dungeonOccupancy([held(state, "paupers-tomb")])).toContain(
			"paupers-tomb",
		);
	}
});

test("an idle squad holds nothing, stale target or not", () => {
	expect(dungeonOccupancy([held("idle", "paupers-tomb")]).size).toBe(0);
});

test("excludeSquadId drops that squad", () => {
	expect(
		dungeonOccupancy([held("returning", "paupers-tomb")], "S-01").size,
	).toBe(0);
});
