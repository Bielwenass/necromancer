import { DUNGEON_DEFS } from "./data/dungeons";
import { TICKS_PER_DAY } from "./data/pacing";
import { accruePassive, depositLoot, shouldAutoDeploy } from "./rules/loot";
import { effectiveTravelTicks } from "./rules/travel";
import { checkUnlockConditions } from "./rules/unlocks";
import type { GameState } from "./types";

export function gameTick(state: GameState): Partial<GameState> {
	const result: Partial<GameState> = {};
	const derived = state.derived;

	// ── 1. Passive resources ─────────────────────────────────────
	const newResources = { ...state.resources };
	accruePassive(newResources, derived);

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

				if (squad.pendingLoot) {
					depositLoot(newResources, squad.pendingLoot, derived);
				}
				updated.pendingLoot = null;

				// `manualRecall` is read before being cleared — the flag describes the
				// trip that just ended, not the next one.
				const dungeonState = (result.dungeons ?? state.dungeons).find(
					(d) => d.id === squad.targetDungeonId,
				);
				const redeploy = shouldAutoDeploy(derived, squad, dungeonState);
				updated.manualRecall = false;

				if (redeploy) {
					updated.state = "traveling";
					updated.position = 0;
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
