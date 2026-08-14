import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import { DUNGEON_DEFS } from "./data/dungeons";
import { TICK_MS } from "./data/pacing";
import type { GameState } from "./types";

/**
 * The fights the player is watching. React-free, so the parity tests drive the
 * shipped live path. The engine is authoritative: its seed comes from game state
 * and it steps in whole `ENGINE_DT`.
 */

export interface FinishedFight {
	squadId: string;
	winner: "a" | "b" | "draw";
	survivorsByType: Record<string, number>;
}

/**
 * Engines for every squad that entered `fighting` without one; the caller keeps
 * ownership of the map. Called after `stepLiveFights`, so an engine's first step
 * falls on the tick after the one that started it, making a watched fight last
 * the `durationTicks` the headless run reports.
 */
export function beginLiveFights(
	state: GameState,
	engines: ReadonlyMap<string, CombatEngine>,
): Array<[string, CombatEngine]> {
	const started: Array<[string, CombatEngine]> = [];

	for (const squad of state.squads) {
		if (
			squad.state !== "fighting" ||
			squad.fightSeed === undefined ||
			!squad.targetDungeonId ||
			engines.has(squad.id)
		) {
			continue;
		}
		const def = DUNGEON_DEFS[squad.targetDungeonId];
		if (!def) continue;

		const engine = new CombatEngine({
			width: COMBAT_W,
			height: COMBAT_H,
			seed: squad.fightSeed,
		});
		engine.setSide("a", buildAttackerConfig(squad.composition, state.derived));
		engine.setSide("b", buildDefenderConfig(def, state.derived));
		engine.start();
		started.push([squad.id, engine]);
	}

	return started;
}

/**
 * Advance every live engine by one game tick of sim time and report the fights
 * that ended; the caller applies each result and retires its engine. One `tick`
 * call each, never a hand-rolled `ENGINE_DT` loop.
 */
export function stepLiveFights(
	engines: ReadonlyMap<string, CombatEngine>,
	combatSpeedMultiplier: number,
): FinishedFight[] {
	const simMs = TICK_MS * combatSpeedMultiplier;
	const finished: FinishedFight[] = [];

	for (const [squadId, engine] of engines) {
		engine.tick(simMs);
		const winner = engine.getWinner();
		if (winner === null) continue;
		finished.push({ squadId, winner, survivorsByType: engine.getCounts().a });
	}

	return finished;
}
