import { DUNGEON_DEFS } from "./data/dungeons";
import { checkUnlockConditions } from "./dungeons";
import { effectiveTravelTicks } from "./travel";
import type { DungeonDef, GameState, Resources } from "./types";

const TICKS_PER_DAY = 1200; // 2 minutes per in-game day

/**
 * Chance that a felled enemy leaves a usable body behind. Corpses are not a
 * per-dungeon loot range any more — they come off the kill count, so a dungeon
 * pays corpses through the size of its roster rather than a hand-tuned table.
 */
export const CORPSE_DROP_CHANCE = 0.2;

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
 * `soulHarvestBonus` multiplies the dungeon's soul chance, which is what `n0`
 * ("+50% soul drop chance"), `n3b` and the `soulOnKill` affix all describe. The
 * chance is clamped at 1 so a heavily-stacked build can't roll past certainty.
 */
export function effectiveSoulChance(
	base: number,
	soulHarvestBonus: number,
): number {
	return Math.min(1, base * (1 + soulHarvestBonus));
}

export function generateLoot(
	dungeonId: string,
	clearCount: number,
	soulHarvestBonus: number,
): Partial<Resources> {
	const def = DUNGEON_DEFS[dungeonId];
	if (!def) return {};

	const clearBonus = 1 + Math.sqrt(clearCount + 1) * 0.07;
	const lt = def.lootTable;

	const bones = Math.round(
		(lt.bonesMin + Math.random() * (lt.bonesMax - lt.bonesMin)) * clearBonus,
	);
	const coins = Math.round(
		(lt.coinsMin + Math.random() * (lt.coinsMax - lt.coinsMin)) * clearBonus,
	);
	// Corpses come off the kill count, so `clearBonus` deliberately misses them.
	const corpses = rollCorpses(dungeonEnemyCount(def), Math.random);
	const souls =
		Math.random() < effectiveSoulChance(lt.soulChance, soulHarvestBonus)
			? 1
			: 0;

	return { bones, coins, corpses, souls };
}

export function gameTick(state: GameState): Partial<GameState> {
	const result: Partial<GameState> = {};
	const derived = state.derived;

	// ── 1. Passive resources ─────────────────────────────────────
	const newResources = { ...state.resources };
	newResources.bones += derived.bonesPerTick;
	newResources.coins += derived.coinsPerTick;
	newResources.souls += derived.soulsPerTick;

	// ── 2 & 3 & 4. Advance squads ────────────────────────────────
	const newSquads = state.squads.map((squad) => {
		const updated = {
			...squad,
			composition: { ...squad.composition },
		};

		if (squad.state === "traveling") {
			const def = squad.targetDungeonId
				? DUNGEON_DEFS[squad.targetDungeonId]
				: undefined;
			if (!def) return updated;
			updated.position +=
				1 / effectiveTravelTicks(def, derived.squadTravelSpeedBonus);

			if (updated.position >= 1) {
				updated.position = 0;
				updated.state = "fighting";
				updated.fightSeed = Math.floor(Math.random() * 0xffffffff);
				updated.fightStartWallTime = Date.now();
			}
		} else if (squad.state === "fighting") {
			// The visual simulation in CombatWindow is the fight — outcome is applied
			// via store.resolveFight() when the engine reports a winner.
		} else if (squad.state === "returning") {
			const def = squad.targetDungeonId
				? DUNGEON_DEFS[squad.targetDungeonId]
				: undefined;
			if (!def) return updated;
			updated.position -=
				1 / effectiveTravelTicks(def, derived.squadTravelSpeedBonus);

			if (updated.position <= 0) {
				updated.position = 0;
				updated.state = "idle";

				// Deposit loot
				if (squad.pendingLoot) {
					const loot = squad.pendingLoot;
					newResources.bones +=
						(loot.bones ?? 0) * (1 + derived.boneYieldBonus);
					newResources.coins +=
						(loot.coins ?? 0) * (1 + derived.coinYieldBonus);
					newResources.souls +=
						(loot.souls ?? 0) * (1 + derived.soulsYieldBonus);
					newResources.corpses +=
						(loot.corpses ?? 0) * (1 + derived.corpseYieldBonus);
				}
				updated.pendingLoot = null;

				updated.manualRecall = false;

				// Auto-deploy if enabled and not manually recalled
				if (
					derived.autoDeploy &&
					squad.targetDungeonId &&
					!squad.manualRecall
				) {
					const dungeonState = (result.dungeons ?? state.dungeons).find(
						(d) => d.id === squad.targetDungeonId,
					);
					if (dungeonState?.unlocked) {
						const totalUnits = Object.values(updated.composition).reduce(
							(s, n) => s + n,
							0,
						);
						if (totalUnits > 0) {
							updated.state = "traveling";
							updated.position = 0;
						}
					}
				}
			}
		}

		return updated;
	});

	// Banners are awarded by `resolveFight`, not here — a fight is decided by the
	// combat engine, which the tick deliberately never touches.

	// ── 5. Unlock check ──────────────────────────────────────────
	if (!result.dungeons) result.dungeons = [...state.dungeons];
	result.dungeons = checkUnlockConditions(result.dungeons);

	// ── 6. Day count ─────────────────────────────────────────────
	const newMeta = {
		...state.meta,
		tickCount: state.meta.tickCount + 1,
		lastTickAt: Date.now(),
	};
	newMeta.dayCount = Math.floor(newMeta.tickCount / TICKS_PER_DAY);

	return {
		...result,
		resources: newResources,
		squads: newSquads,
		meta: newMeta,
	};
}
