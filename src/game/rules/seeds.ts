import { mulberry32 } from "../../combat/prng";
import type { SquadComposition } from "../types";

/**
 * Deterministic seeds for the two rolls a run makes, the fight and its loot.
 * Both paths derive them the same way, so a mid-window refresh reproduces a
 * result. Every input is persisted state.
 */

function hashSeed(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** Zero counts drop, so a roster that lost its last zombie signs as one that never had one. */
export function compositionSig(c: SquadComposition): string {
	return Object.entries(c)
		.filter(([_key, count]) => count > 0)
		.map(([key, count]) => `${key}:${count}`)
		.join("|");
}

/**
 * Who is fighting whom, plus `clearCount` so repeat clears differ. Squad id is
 * excluded: two squads of the same makeup face the same situation.
 */
export function deriveFightSeed(
	dungeonId: string,
	composition: SquadComposition,
	clearCount: number,
): number {
	return hashSeed(`${dungeonId}|${compositionSig(composition)}|${clearCount}`);
}

export function lootRand(
	squadId: string,
	dungeonId: string,
	clearCount: number,
): () => number {
	return mulberry32(hashSeed(`loot|${squadId}|${dungeonId}|${clearCount}`));
}
