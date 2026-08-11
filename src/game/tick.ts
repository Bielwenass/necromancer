import { DUNGEON_DEFS } from "./data/dungeons";
import { checkUnlockConditions } from "./dungeons";
import type { GameState, Resources } from "./types";

const TICKS_PER_DAY = 1200; // 2 minutes per in-game day

export function generateLoot(
	dungeonId: string,
	clearCount: number,
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
	const corpses = Math.round(
		(lt.corpseMin + Math.random() * (lt.corpseMax - lt.corpseMin)) * clearBonus,
	);
	const souls = Math.random() < lt.soulChance ? 1 : 0;

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
	const earnedPoints = 0;
	const newSquads = state.squads.map((squad) => {
		const updated = {
			...squad,
			currentHp: { ...squad.currentHp },
			composition: { ...squad.composition },
		};

		if (squad.state === "traveling") {
			const def = squad.targetDungeonId
				? DUNGEON_DEFS[squad.targetDungeonId]
				: undefined;
			if (!def) return updated;
			const speedMult = 1 + derived.squadTravelSpeedBonus;
			updated.position += (1 / def.travelTimeTicks) * speedMult;

			if (updated.position >= 1) {
				updated.position = 0;
				updated.state = "fighting";
				updated.fightSeed = Math.floor(Math.random() * 0xffffffff);
				updated.fightStartWallTime = Date.now();
				// Restore full HP on arrival
				// TODO
				// for (const type of ['skeleton', 'zombie', 'wraith'] as const) {
				//   const hpBonus = type === 'skeleton' ? derived.skeletonHpBonus : type === 'zombie' ? derived.zombieHpBonus : derived.wraithHpBonus;
				//   updated.currentHp[type] = squad.composition[type] * UNIT_STATS[type].hp * (1 + hpBonus);
				// }
			}
		} else if (squad.state === "fighting") {
			// The visual simulation in CombatWindow is the fight — outcome is applied
			// via store.resolveFight() when the engine reports a winner.
		} else if (squad.state === "returning") {
			const def = squad.targetDungeonId
				? DUNGEON_DEFS[squad.targetDungeonId]
				: undefined;
			if (!def) return updated;
			const speedMult = 1 + derived.squadTravelSpeedBonus;
			updated.position -= (1 / def.travelTimeTicks) * speedMult;

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
					newResources.corpses += loot.corpses ?? 0;
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
							// Restore HP for re-deploy
							// TODO
							// for (const type of ['skeleton', 'zombie', 'wraith'] as const) {
							//   const hpBonus = type === 'skeleton' ? derived.skeletonHpBonus : type === 'zombie' ? derived.zombieHpBonus : derived.wraithHpBonus;
							//   updated.currentHp[type] = updated.composition[type] * UNIT_STATS[type].hp * (1 + hpBonus);
							// }
						}
					}
				}
			}
		}

		return updated;
	});

	// Apply earned upgrade points after all squads are processed
	if (earnedPoints > 0) {
		result.upgrades = {
			...state.upgrades,
			availablePoints: state.upgrades.availablePoints + earnedPoints,
		};
	}

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
