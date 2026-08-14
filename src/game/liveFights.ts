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
 * The fights the player is watching. React-free so the parity tests can drive
 * the real live path rather than a copy of it.
 *
 * The engine is authoritative and `resolveFight` applies whatever it reports.
 * The seed is derived from game state and the engine steps in whole `ENGINE_DT`
 * units whatever it is fed, so this reaches the headless run's verdict.
 */

export interface FinishedFight {
	squadId: string;
	winner: "a" | "b" | "draw";
	survivorsByType: Record<string, number>;
}

/**
 * Engines for every squad that has entered `fighting` without one. Returned
 * rather than installed, so the caller keeps ownership of the engine map.
 *
 * Called *after* `stepLiveFights`, so an engine takes its first step on the tick
 * after the one that started it — the fight occupies the ticks after arrival,
 * which is what makes it last the `durationTicks` the headless run reports.
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
 * Advance every live engine by one game tick's worth of sim time and report the
 * fights that ended. The caller applies each result and retires its engine.
 *
 * One `tick` call per engine, never a hand-rolled loop of `ENGINE_DT` steps: the
 * engine carries the sub-step remainder itself.
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
