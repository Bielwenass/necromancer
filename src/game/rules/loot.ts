import { DUNGEON_DEFS } from "../data/dungeons";
import {
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
import { squadSize } from "./units";

export { CORPSE_DROP_CHANCE };

/** The `derived` projection, as read by everything that prices a run. */
type Derived = GameState["derived"];

/**
 * Enemies a dungeon fields. A squad only wins once side B is at zero, so on a
 * clear this is exactly how many enemies fell.
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
 * `soulHarvestBonus` multiplies the dungeon's soul chance, which is what `n0`,
 * `n3b` and the `soulOnKill` affix all describe. The chance is clamped at 1 so
 * a heavily-stacked build can't roll past certainty.
 */
export function effectiveSoulChance(
	base: number,
	soulHarvestBonus: number,
): number {
	return Math.min(1, base * (1 + soulHarvestBonus));
}

/**
 * Repeat-clear payout multiplier. Bones and coins scale with how often a
 * dungeon has been cleared; corpses deliberately don't, since they come off the
 * kill count rather than the loot table.
 */
export function clearMultiplier(clearCount: number): number {
	return 1 + Math.sqrt(clearCount) * CLEAR_MULT_COEFF;
}

/**
 * What a clear drops, before the yield bonuses applied on deposit.
 *
 * `rand` defaults to `Math.random` for the live game; offline catchup passes a
 * seeded generator so a mid-window refresh reproduces identical results.
 */
export function generateLoot(
	dungeonId: string,
	clearCount: number,
	soulHarvestBonus: number,
	rand: () => number = Math.random,
): Partial<Resources> {
	const def = DUNGEON_DEFS[dungeonId];
	if (!def) return {};

	const clearBonus = clearMultiplier(clearCount);
	const lt = def.lootTable;

	const bones = Math.round(
		(lt.bonesMin + rand() * (lt.bonesMax - lt.bonesMin)) * clearBonus,
	);
	const coins = Math.round(
		(lt.coinsMin + rand() * (lt.coinsMax - lt.coinsMin)) * clearBonus,
	);
	// Corpses come off the kill count, so `clearBonus` deliberately misses them.
	const corpses = rollCorpses(dungeonEnemyCount(def), rand);
	const souls =
		rand() < effectiveSoulChance(lt.soulChance, soulHarvestBonus)
			? SOULS_PER_DROP
			: 0;

	return { bones, coins, corpses, souls };
}

/**
 * Bank a squad's haul, applying the yield bonuses. Mutates `resources` — both
 * callers are already building a fresh object or working on a local clone.
 */
export function depositLoot(
	resources: Resources,
	loot: Partial<Resources>,
	derived: Derived,
): void {
	resources.bones += (loot.bones ?? 0) * (1 + derived.boneYieldBonus);
	resources.coins += (loot.coins ?? 0) * (1 + derived.coinYieldBonus);
	resources.souls += (loot.souls ?? 0) * (1 + derived.soulsYieldBonus);
	resources.corpses += (loot.corpses ?? 0) * (1 + derived.corpseYieldBonus);
}

/**
 * Passive income over `ticks`. Mutates `resources`, as `depositLoot` does. The
 * live tick calls this once per step; catchup batches a whole gap into one call
 * rather than looping, which is why the count is a parameter.
 */
export function accruePassive(
	resources: Resources,
	derived: Derived,
	ticks = 1,
): void {
	resources.bones += derived.bonesPerTick * ticks;
	resources.coins += derived.coinsPerTick * ticks;
	resources.souls += derived.soulsPerTick * ticks;
}

/**
 * Whether a squad that just got home should march straight back out. A manual
 * recall suppresses it, which is also how a wiped squad's remnant is kept from
 * walking into the fight that just killed everyone else.
 */
export function shouldAutoDeploy(
	derived: Derived,
	squad: Pick<Squad, "composition" | "manualRecall">,
	dungeonState: DungeonState | undefined,
): boolean {
	if (!derived.autoDeploy) return false;
	if (squad.manualRecall) return false;
	if (!dungeonState?.unlocked) return false;
	return squadSize(squad.composition) > 0;
}

/**
 * What a clear is actually worth after every player bonus. Display-only — the
 * numbers here are the same ones `generateLoot` rolls and `gameTick` deposits,
 * minus the per-roll rounding.
 */
export interface ProjectedLoot {
	bonesMin: number;
	bonesMax: number;
	coinsMin: number;
	coinsMax: number;
	/** Chance a run drops souls at all, after `soulHarvestBonus`. 0–1. */
	soulChance: number;
	/** Souls banked when that roll hits, scaled by `soulsYieldBonus`. */
	soulsPerDrop: number;
	/** Expected corpses off a full clear: kills × drop chance × yield bonus. */
	corpses: number;
	/** The repeat-clear multiplier folded into the bone and coin figures. */
	clearMult: number;
	/**
	 * The player's own contribution to each line, as a ratio over the bare loot
	 * table. Carried here so the Crypt card can quote a breakdown without
	 * re-deriving the base or dividing `clearMult` back out.
	 */
	boneBonus: number;
	soulBonus: number;
	corpseBonus: number;
}

/**
 * Folds the repeat-clear bonus (applied to the roll) and the yield bonuses
 * (applied on deposit) into a single projection of a run's payout, so the Crypt
 * shows what a dispatch is worth to *this* necromancer rather than what the
 * bare loot table says.
 */
export function projectLoot(
	def: DungeonDef,
	clearCount: number,
	derived: Derived,
): ProjectedLoot {
	const clearMult = clearMultiplier(clearCount);
	const lt = def.lootTable;
	const boneBonus = 1 + derived.boneYieldBonus;
	const corpseBonus = 1 + derived.corpseYieldBonus;
	const coinMult = clearMult * (1 + derived.coinYieldBonus);
	const soulChance = effectiveSoulChance(
		lt.soulChance,
		derived.soulHarvestBonus,
	);

	return {
		bonesMin: lt.bonesMin * clearMult * boneBonus,
		bonesMax: lt.bonesMax * clearMult * boneBonus,
		coinsMin: lt.coinsMin * coinMult,
		coinsMax: lt.coinsMax * coinMult,
		soulChance,
		soulsPerDrop: SOULS_PER_DROP + derived.soulsYieldBonus,
		corpses: dungeonEnemyCount(def) * CORPSE_DROP_CHANCE * corpseBonus,
		clearMult,
		boneBonus,
		soulBonus: lt.soulChance > 0 ? soulChance / lt.soulChance : 1,
		corpseBonus,
	};
}
