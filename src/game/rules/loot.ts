import { DUNGEON_DEFS } from "../data/dungeons";
import {
	BANNERS_PER_TIER,
	CLEAR_MULT_COEFF,
	CORPSE_DROP_CHANCE,
	SOULS_PER_DROP,
} from "../data/economy";
import type {
	DungeonDef,
	DungeonState,
	GameState,
	Resources,
	Squad,
} from "../types";
import { RESOURCE_KEYS } from "./resources";
import { squadSize } from "./units";

export { CORPSE_DROP_CHANCE };

/** The `derived` projection, as read by everything that prices a run. */
type Derived = GameState["derived"];

/**
 * Enemies a dungeon fields. A squad only wins once side B is at zero, so on a
 * clear this is how many fell.
 */
export function dungeonEnemyCount(def: DungeonDef): number {
	return def.enemies.reduce((n, e) => n + e.amount, 0);
}

/** One independent `CORPSE_DROP_CHANCE` roll per felled enemy. */
export function rollCorpses(enemiesFelled: number, rand: () => number): number {
	let corpses = 0;
	for (let i = 0; i < enemiesFelled; i++) {
		if (rand() < CORPSE_DROP_CHANCE) corpses++;
	}
	return corpses;
}

/**
 * `soulHarvestBonus` multiplies the dungeon's soul chance, clamped at 1. Past
 * certainty `soulsYieldBonus` is what keeps paying.
 */
export function effectiveSoulChance(
	base: number,
	soulHarvestBonus: number,
): number {
	return Math.min(1, base * (1 + soulHarvestBonus));
}

/**
 * Repeat-clear payout multiplier. Bones scale with a dungeon's clear count;
 * corpses don't, since they come off the kill count rather than the loot table.
 * `clearMultBonus` (the Tomb Robber affix) steepens the curve rather than
 * shifting it, so it pays nothing on a first clear.
 *
 * Logarithmic: most of the value arrives in the first day or two on a dungeon
 * and each further step costs ten times the clears, so farming one dungeon
 * focuses a resource without out-earning the ladder.
 */
export function clearMultiplier(
	clearCount: number,
	clearMultBonus = 0,
): number {
	return (
		1 + Math.log10(1 + clearCount) * CLEAR_MULT_COEFF * (1 + clearMultBonus)
	);
}

/**
 * What a clear drops, before the yield bonuses applied on deposit. Corpses and
 * souls are gated — until the tree opens each economy the roll is skipped, so an
 * early necromancer banks bones and nothing else.
 */
export function generateLoot(
	dungeonId: string,
	clearCount: number,
	derived: Derived,
	rand: () => number = Math.random,
): Partial<Resources> {
	const def = DUNGEON_DEFS[dungeonId];
	if (!def) return {};

	const clearBonus = clearMultiplier(clearCount, derived.clearMultBonus);
	const lt = def.lootTable;

	const bones = Math.round(
		(lt.bonesMin + rand() * (lt.bonesMax - lt.bonesMin)) * clearBonus,
	);
	// Corpses come off the kill count, so `clearBonus` deliberately misses them.
	const corpses = derived.corpsesUnlocked
		? rollCorpses(dungeonEnemyCount(def), rand)
		: 0;
	const souls =
		derived.soulsUnlocked &&
		rand() < effectiveSoulChance(lt.soulChance, derived.soulHarvestBonus)
			? SOULS_PER_DROP
			: 0;
	// Rolled last, so the bonus can't shift an existing seed's other rolls.
	const banners =
		def.tier * BANNERS_PER_TIER + (rand() < derived.bannerChanceBonus ? 1 : 0);

	return { bones, corpses, souls, banners };
}

/** Each resource's yield bonus; 0 for the ones no upgrade scales. */
function yieldBonuses(derived: Derived): Record<keyof Resources, number> {
	return {
		bones: derived.boneYieldBonus,
		souls: derived.soulsYieldBonus,
		corpses: derived.corpseYieldBonus,
		dust: 0,
		banners: 0,
	};
}

/** Bank a squad's haul with the yield bonuses. Mutates `resources`. */
export function depositLoot(
	resources: Resources,
	loot: Partial<Resources>,
	derived: Derived,
): void {
	const bonus = yieldBonuses(derived);
	for (const key of RESOURCE_KEYS) {
		resources[key] += (loot[key] ?? 0) * (1 + bonus[key]);
	}
}

/**
 * Passive income over `ticks`. Mutates `resources`. The count is a parameter
 * because catchup batches a whole gap into one call rather than looping.
 */
export function accruePassive(
	resources: Resources,
	derived: Derived,
	ticks = 1,
): void {
	resources.bones += derived.bonesPerTick * ticks;
}

/**
 * Whether a squad that just got home should march straight back out. A manual
 * recall suppresses it, which is also what keeps a wiped squad's remnant from
 * walking into the fight that killed everyone else.
 *
 * `occupied` is `dungeonOccupancy` over the current squads — a set rather than
 * the squad list so a caller resolving several arrivals in one tick can add to
 * it as it goes. The caller must have already set the arriving squad to `idle`,
 * so it is never counted as holding its own target.
 */
export function shouldAutoDeploy(
	derived: Derived,
	squad: Pick<Squad, "composition" | "manualRecall" | "targetDungeonId">,
	dungeonState: DungeonState | undefined,
	occupied: ReadonlySet<string>,
): boolean {
	if (!derived.autoDeploy) return false;
	if (squad.manualRecall) return false;
	if (!dungeonState?.unlocked) return false;
	if (squad.targetDungeonId !== null && occupied.has(squad.targetDungeonId)) {
		return false;
	}
	return squadSize(squad.composition) > 0;
}

/** What a clear is worth after every player bonus. Display-only. */
export interface ProjectedLoot {
	bonesMin: number;
	bonesMax: number;
	/** Chance a run drops souls at all, after `soulHarvestBonus`. 0 while locked. */
	soulChance: number;
	/** Souls banked when that roll hits, scaled by `soulsYieldBonus`. */
	soulsPerDrop: number;
	/** Expected corpses off a full clear: kills × drop chance × yield bonus. */
	corpses: number;
	/** The repeat-clear multiplier folded into the bone figures. */
	clearMult: number;
	/**
	 * The player's own contribution to each line, as a ratio over the bare loot
	 * table, so the Crypt card can quote a breakdown without re-deriving the base.
	 */
	boneBonus: number;
	soulBonus: number;
	corpseBonus: number;
}

/**
 * Folds the repeat-clear bonus (applied to the roll) and the yield bonuses
 * (applied on deposit) into one projection, so the Crypt shows what a dispatch
 * is worth to *this* necromancer rather than what the loot table says.
 */
export function projectLoot(
	def: DungeonDef,
	clearCount: number,
	derived: Derived,
): ProjectedLoot {
	const clearMult = clearMultiplier(clearCount, derived.clearMultBonus);
	const lt = def.lootTable;
	const boneBonus = 1 + derived.boneYieldBonus;
	const corpseBonus = 1 + derived.corpseYieldBonus;
	// A locked economy projects as zero, matching what `generateLoot` will roll.
	const soulChance = derived.soulsUnlocked
		? effectiveSoulChance(lt.soulChance, derived.soulHarvestBonus)
		: 0;

	return {
		bonesMin: lt.bonesMin * clearMult * boneBonus,
		bonesMax: lt.bonesMax * clearMult * boneBonus,
		soulChance,
		soulsPerDrop: SOULS_PER_DROP * (1 + derived.soulsYieldBonus),
		corpses: derived.corpsesUnlocked
			? dungeonEnemyCount(def) * CORPSE_DROP_CHANCE * corpseBonus
			: 0,
		clearMult,
		boneBonus,
		soulBonus: lt.soulChance > 0 ? soulChance / lt.soulChance : 1,
		corpseBonus,
	};
}
