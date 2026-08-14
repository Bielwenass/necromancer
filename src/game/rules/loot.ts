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

type Derived = GameState["derived"];

export function dungeonEnemyCount(def: DungeonDef): number {
	return def.enemies.reduce((n, e) => n + e.amount, 0);
}

export function rollCorpses(enemiesFelled: number, rand: () => number): number {
	let corpses = 0;
	for (let i = 0; i < enemiesFelled; i++) {
		if (rand() < CORPSE_DROP_CHANCE) corpses++;
	}
	return corpses;
}

/** Multiplies the dungeon's soul chance, clamped at 1. */
export function effectiveSoulChance(
	base: number,
	soulHarvestBonus: number,
): number {
	return Math.min(1, base * (1 + soulHarvestBonus));
}

/**
 * Repeat-clear payout multiplier on the loot table, leaving corpses untouched.
 * `clearMultBonus` steepens the curve, so it pays nothing on a first clear.
 * Logarithmic: each further step costs ten times the clears.
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
 * What a clear drops, before deposit-time yield bonuses. The corpse and soul
 * rolls are skipped until the tree opens each economy.
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
	// Corpses come off the kill count, outside `clearBonus`.
	const corpses = derived.corpsesUnlocked
		? rollCorpses(dungeonEnemyCount(def), rand)
		: 0;
	const souls =
		derived.soulsUnlocked &&
		rand() < effectiveSoulChance(lt.soulChance, derived.soulHarvestBonus)
			? SOULS_PER_DROP
			: 0;
	const banners =
		def.tier * BANNERS_PER_TIER + (rand() < derived.bannerChanceBonus ? 1 : 0);

	return { bones, corpses, souls, banners };
}

function yieldBonuses(derived: Derived): Record<keyof Resources, number> {
	return {
		bones: derived.boneYieldBonus,
		souls: derived.soulsYieldBonus,
		corpses: derived.corpseYieldBonus,
		dust: 0,
		banners: 0,
	};
}

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

/** Passive income over `ticks`; catchup batches a whole gap into one call. */
export function accruePassive(
	resources: Resources,
	derived: Derived,
	ticks = 1,
): void {
	resources.bones += derived.bonesPerTick * ticks;
}

/**
 * Whether a squad that just got home should march straight back out. A manual
 * recall suppresses it, keeping a wiped squad's remnant out of the fight that
 * killed everyone else. `occupied` is a set so a caller resolving several
 * arrivals in one tick adds to it as it goes; the arriving squad must be `idle`.
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

export interface ProjectedLoot {
	bonesMin: number;
	bonesMax: number;
	soulChance: number;
	soulsPerDrop: number;
	corpses: number;
	clearMult: number;
	boneBonus: number;
	soulBonus: number;
	corpseBonus: number;
}

/** The repeat-clear and yield bonuses folded into what a dispatch is worth. */
export function projectLoot(
	def: DungeonDef,
	clearCount: number,
	derived: Derived,
): ProjectedLoot {
	const clearMult = clearMultiplier(clearCount, derived.clearMultBonus);
	const lt = def.lootTable;
	const boneBonus = 1 + derived.boneYieldBonus;
	const corpseBonus = 1 + derived.corpseYieldBonus;
	// A locked economy projects zero, matching `generateLoot`.
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
