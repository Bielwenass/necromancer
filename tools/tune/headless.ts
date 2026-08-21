import { collisionRadius } from "../../src/combat/simulation";
import { ENGINE_DT } from "../../src/game/data/pacing";
import { type Army, armyTotal, createFight } from "./fight";

export interface BurstResult {
	label: string;
	perTickMs: number;
	ticks: number;
	resolved: boolean;
	aliveA: number;
	aliveB: number;
}

/**
 * A fight with no canvas and no frame budget: the clean per-tick number, since a
 * rendered run is paced by the display.
 */
export function burst(
	armyA: Army,
	armyB: Army,
	seed: number,
	maxTicks: number,
	label: string,
): BurstResult {
	const engine = createFight(armyA, armyB, seed, "off");
	const start = performance.now();
	while (engine.getWinner() === null && engine.stats.numTicks < maxTicks) {
		engine.tick(ENGINE_DT);
	}
	const wall = performance.now() - start;
	return {
		label,
		perTickMs: engine.stats.numTicks > 0 ? wall / engine.stats.numTicks : 0,
		ticks: engine.stats.numTicks,
		resolved: engine.getWinner() !== null,
		aliveA: engine.getTotalCount("a"),
		aliveB: engine.getTotalCount("b"),
	};
}

export function describeBurst(r: BurstResult): string {
	const outcome = r.resolved
		? `resolved ${r.ticks}t`
		: `unresolved at ${r.ticks}t`;
	return `${r.label}: ${r.perTickMs.toFixed(3)}ms/tick, ${outcome}, ${r.aliveA}/${r.aliveB} left`;
}

export function currentCollisionRadius(armyA: Army, armyB: Army): number {
	return collisionRadius(armyTotal(armyA) + armyTotal(armyB));
}
