import { BANNERS_PER_TIER } from "../data/economy";
import type { CombatOutcome, DungeonDef, Resources, UnitType } from "../types";
import { generateLoot } from "./loot";
import { compositionAfterFight, remnantAfterWipe, squadSize } from "./units";

/**
 * What a finished fight does to the squad and the ledger.
 *
 * - `cleared` — side A won: survivors walk home with loot and banners.
 * - `retreat` — side A lost but its undying reformed: they walk home empty.
 * - `destroyed` — side A lost with nothing undying left; the squad is gone.
 */
export interface FightResolution {
	kind: "cleared" | "retreat" | "destroyed";
	composition: Record<UnitType, number>;
	loot: Partial<Resources> | null;
	bannersAwarded: number;
	clearCountDelta: number;
	/**
	 * True when the squad should be treated as manually recalled. A wiped
	 * squad's remnant sets this so auto-deploy doesn't march it straight back
	 * into the fight that just killed everyone else.
	 */
	suppressAutoDeploy: boolean;
}

/**
 * The rules for turning a combat result into game state — shared verbatim by
 * the live store action and the offline catchup.
 *
 * `rand` is threaded through to `generateLoot`: the live path leaves it at
 * `Math.random`, catchup passes a seeded generator.
 */
export function resolveFightOutcome(
	before: Record<UnitType, number>,
	def: DungeonDef,
	clearCount: number,
	outcome: CombatOutcome,
	soulHarvestBonus: number,
	rand: () => number = Math.random,
): FightResolution {
	if (outcome.winner !== "a") {
		// A wipe destroys the squad — except for its undying, who reform on the
		// spot and walk home empty-handed. With none of them the squad is simply
		// gone, and nothing is left to carry loot or claim a banner.
		const remnant = remnantAfterWipe(before);
		if (squadSize(remnant) === 0) {
			return {
				kind: "destroyed",
				composition: remnant,
				loot: null,
				bannersAwarded: 0,
				clearCountDelta: 0,
				suppressAutoDeploy: true,
			};
		}
		return {
			kind: "retreat",
			composition: remnant,
			loot: null,
			bannersAwarded: 0,
			clearCountDelta: 0,
			suppressAutoDeploy: true,
		};
	}

	return {
		kind: "cleared",
		composition: compositionAfterFight(before, outcome.survivorsByType),
		loot: generateLoot(def.id, clearCount, soulHarvestBonus, rand),
		bannersAwarded: def.tier * BANNERS_PER_TIER,
		clearCountDelta: 1,
		suppressAutoDeploy: false,
	};
}
