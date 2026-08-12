import { BANNERS_PER_TIER } from "../data/economy";
import type {
	CombatOutcome,
	DungeonDef,
	GameState,
	Resources,
	UnitType,
} from "../types";
import { generateLoot } from "./loot";
import { compositionAfterFight, remnantAfterWipe, squadSize } from "./units";

/** The `derived` projection, as read by everything that resolves a fight. */
type Derived = GameState["derived"];

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
 * Losses that claw their way home as skeletons, one independent roll per unit
 * lost. Resolved out here rather than in the engine: a unit that dies mid-fight
 * is genuinely gone from the battle, and only walks back out of the tomb once
 * the fighting stops.
 *
 * Capped at the squad's own size limit, since the returning squad has to be a
 * legal one.
 */
function reanimated(
	before: Record<UnitType, number>,
	after: Record<UnitType, number>,
	derived: Derived,
	rand: () => number,
): number {
	if (derived.reanimateChance <= 0) return 0;

	let lost = 0;
	for (const type of Object.keys(before) as UnitType[]) {
		lost += Math.max(0, before[type] - after[type]);
	}

	let raised = 0;
	for (let i = 0; i < lost; i++) {
		if (rand() < derived.reanimateChance) raised++;
	}

	const room = derived.maxSquadSize - squadSize(after);
	return Math.max(0, Math.min(raised, room));
}

/**
 * The rules for turning a combat result into game state — shared verbatim by
 * the live store action and the offline catchup.
 *
 * `rand` is threaded through to `generateLoot` and the reanimation rolls: the
 * live path leaves it at `Math.random`, catchup passes a seeded generator.
 */
export function resolveFightOutcome(
	before: Record<UnitType, number>,
	def: DungeonDef,
	clearCount: number,
	outcome: CombatOutcome,
	derived: Derived,
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

	const composition = compositionAfterFight(before, outcome.survivorsByType);
	composition.skeleton += reanimated(before, composition, derived, rand);

	// The bonus banner is rolled after the loot so that adding it can't shift the
	// loot roll of an existing seed.
	const loot = generateLoot(def.id, clearCount, derived, rand);
	const bonusBanner = rand() < derived.bannerChanceBonus ? 1 : 0;

	return {
		kind: "cleared",
		composition,
		loot,
		bannersAwarded: def.tier * BANNERS_PER_TIER + bonusBanner,
		clearCountDelta: 1,
		suppressAutoDeploy: false,
	};
}
