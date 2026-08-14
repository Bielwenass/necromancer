import type {
	CombatOutcome,
	DungeonDef,
	GameState,
	Resources,
	UnitType,
} from "../types";
import { generateLoot } from "./loot";
import { compositionAfterFight, remnantAfterWipe, squadSize } from "./units";

type Derived = GameState["derived"];

/**
 * What a finished fight does to the squad and the ledger.
 *
 * - `cleared`: side A won, survivors walk home with loot and banners.
 * - `retreat`: side A lost, its undying reformed and walk home empty.
 * - `destroyed`: side A lost with nothing undying left; the squad is gone.
 */
export interface FightResolution {
	kind: "cleared" | "retreat" | "destroyed";
	composition: Record<UnitType, number>;
	loot: Partial<Resources> | null;
	/**
	 * Treat the squad as manually recalled. A wiped squad's remnant sets this so
	 * auto-deploy leaves it out of the fight that killed everyone else.
	 */
	suppressAutoDeploy: boolean;
}

/**
 * Losses that claw their way home as skeletons, one roll per unit lost. Outside
 * the engine, so a unit that dies mid-fight is gone from the battle. Capped to a
 * legal returning squad.
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

/** Turns a combat result into game state, shared verbatim by both paths. */
export function resolveFightOutcome(
	before: Record<UnitType, number>,
	def: DungeonDef,
	clearCount: number,
	outcome: CombatOutcome,
	derived: Derived,
	rand: () => number = Math.random,
): FightResolution {
	if (outcome.winner !== "a") {
		// A wipe leaves only the undying, who reform and walk home empty-handed;
		// with none of them the squad is gone.
		const remnant = remnantAfterWipe(before);
		if (squadSize(remnant) === 0) {
			return {
				kind: "destroyed",
				composition: remnant,
				loot: null,
				suppressAutoDeploy: true,
			};
		}
		return {
			kind: "retreat",
			composition: remnant,
			loot: null,
			suppressAutoDeploy: true,
		};
	}

	const composition = compositionAfterFight(before, outcome.survivorsByType);
	composition.skeleton += reanimated(before, composition, derived, rand);

	return {
		kind: "cleared",
		composition,
		loot: generateLoot(def.id, clearCount, derived, rand),
		suppressAutoDeploy: false,
	};
}
