import { mulberry32 } from "../../combat/prng";

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
export function compositionSig(c: Record<string, number>): string {
	return Object.keys(c)
		.filter((k) => c[k] > 0)
		.sort()
		.map((k) => `${k}:${c[k]}`)
		.join("|");
}

/**
 * Who is fighting whom, plus `clearCount` so repeat clears differ. Squad id is
 * excluded: two squads of the same makeup face the same situation.
 */
export function deriveFightSeed(
	dungeonId: string,
	composition: Record<string, number>,
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
