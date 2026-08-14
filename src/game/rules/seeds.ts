import { mulberry32 } from "../../combat/prng";

/**
 * Deterministic seeds for the two rolls a run makes — the fight and the loot it
 * pays. Both paths derive them the same way, so a mid-window refresh reproduces
 * a result rather than rerolling it. Every input is persisted state the player
 * cannot choose, so the seed changes only when the situation does.
 */

/** FNV-1a, 32-bit. Cheap, well-mixed for short keys, stable across runs. */
function hashSeed(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/**
 * Stable signature of a squad's makeup. Zero counts are dropped so two spellings
 * of the same roster — one that never held a zombie, one that lost its last —
 * sign identically.
 */
export function compositionSig(c: Record<string, number>): string {
	return Object.keys(c)
		.filter((k) => c[k] > 0)
		.sort()
		.map((k) => `${k}:${c[k]}`)
		.join("|");
}

/**
 * The fight's seed. Keyed on who is fighting whom, plus `clearCount` so repeat
 * clears play out differently rather than replaying one canonical battle.
 *
 * Not keyed on the squad's id: two squads of the same makeup hitting the same
 * dungeon are the same tactical situation.
 */
export function deriveFightSeed(
	dungeonId: string,
	composition: Record<string, number>,
	clearCount: number,
): number {
	return hashSeed(`${dungeonId}|${compositionSig(composition)}|${clearCount}`);
}

/**
 * The loot roll, plus the reanimation rolls riding along with it in
 * `resolveFightOutcome`. Keyed on the squad rather than its makeup — the haul is
 * a property of the trip.
 */
export function lootRand(
	squadId: string,
	dungeonId: string,
	clearCount: number,
): () => number {
	return mulberry32(hashSeed(`loot|${squadId}|${dungeonId}|${clearCount}`));
}
