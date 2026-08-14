import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import {
	advance,
	cloneForAdvance,
	type FightDriver,
	nextDeadline,
} from "./advance";
import { DUNGEON_DEFS } from "./data/dungeons";
import {
	ENGINE_DT,
	MAX_HEADLESS_TICKS,
	MAX_OFFLINE_MS,
	TICK_MS,
} from "./data/pacing";
import { RESOURCE_KEYS, zeroResources } from "./rules/resources";
import { compositionSig, deriveFightSeed } from "./rules/seeds";
import { squadSize } from "./rules/units";
import type {
	CombatOutcome,
	DungeonState,
	GameState,
	Resources,
	Squad,
} from "./types";

/**
 * Offline catchup runs the same `advance` the live tick does and differs only in
 * pacing, jumping to the next tick at which something is due. Two deliberate
 * deviations from house style, both to keep: it mutates its own cloned working
 * state for speed, and it resolves fights headlessly.
 */

type FightOutcome = CombatOutcome & {
	durationTicks: number;
};

export interface CatchupStats {
	eventsProcessed: number;
	gained: Resources;
}

export interface CatchupOptions {
	/** Yield to the event loop every N spans advanced. Default 50. */
	yieldEveryNEvents?: number;
	/** Reuse a clear's result for a repeat. The parity tests turn it off. */
	fightCache?: boolean;
	onProgress?: (cursor: number, target: number, stats?: CatchupStats) => void;
}

function isLossless(
	input: Record<string, number>,
	output: Record<string, number>,
): boolean {
	for (const k of Object.keys(input)) {
		const a = input[k] ?? 0;
		if (a === 0) continue;
		if ((output[k] ?? 0) !== a) return false;
	}
	return true;
}

/** Fights nobody watched, each run to completion the moment the squad arrives. */
class HeadlessFights implements FightDriver {
	private pending = new Map<
		string,
		{ endTick: number; outcome: CombatOutcome }
	>();
	/** Fights actually simulated, as opposed to served from the cache. */
	simulated = 0;

	constructor(private cache: Map<string, FightOutcome> | null) {}

	begin(
		state: GameState,
		squad: Squad,
		dungeon: DungeonState,
		atTick: number,
	): number {
		const outcome = this.runFight(state, squad, dungeon);
		const endTick = atTick + outcome.durationTicks;
		this.pending.set(squad.id, { endTick, outcome });
		return endTick;
	}

	outcomeAt(squadId: string, tick: number): CombatOutcome | null {
		const p = this.pending.get(squadId);
		if (!p || p.endTick > tick) return null;
		this.pending.delete(squadId);
		return p.outcome;
	}

	nextEndTick(): number {
		let earliest = Number.POSITIVE_INFINITY;
		for (const p of this.pending.values()) {
			if (p.endTick < earliest) earliest = p.endTick;
		}
		return earliest;
	}

	private runFight(
		state: GameState,
		squad: Squad,
		dungeon: DungeonState,
	): FightOutcome {
		if (squadSize(squad.composition) === 0) {
			return { winner: "b", survivorsByType: {}, durationTicks: 1 };
		}

		const cacheKey = `${dungeon.id}|${compositionSig(squad.composition)}`;
		const cached = this.cache?.get(cacheKey);
		if (cached) return cached;

		this.simulated++;
		const engine = new CombatEngine({
			width: COMBAT_W,
			height: COMBAT_H,
			seed: deriveFightSeed(dungeon.id, squad.composition, dungeon.clearCount),
		});
		engine.setSide("a", buildAttackerConfig(squad.composition, state.derived));
		engine.setSide(
			"b",
			buildDefenderConfig(DUNGEON_DEFS[dungeon.id], state.derived),
		);
		engine.start();

		let safety = 0;
		while (engine.getWinner() === null && safety < MAX_HEADLESS_TICKS) {
			engine.tick(ENGINE_DT);
			safety++;
		}

		const winner = (engine.getWinner() ?? "draw") as "a" | "b" | "draw";
		const survivorsByType = winner === "a" ? engine.getCounts().a : {};

		// `getT()` is sim time in ms; the speed multiplier converts it to wall clock.
		const csm = state.derived.combatSpeedMultiplier || 1;
		const durationTicks = Math.max(
			1,
			Math.ceil(engine.getT() / (TICK_MS * csm)),
		);
		const outcome: FightOutcome = { winner, survivorsByType, durationTicks };

		// Only lossless wins: everyone survives whatever the seed, so only
		// `durationTicks` is borrowed. The key omits `clearCount`, which would miss on
		// every clear of a farmed dungeon.
		if (
			this.cache &&
			winner === "a" &&
			isLossless(squad.composition, survivorsByType)
		) {
			this.cache.set(cacheKey, outcome);
		}
		return outcome;
	}
}

export async function simulateOffline(
	state: GameState,
	elapsedMs: number,
	options: CatchupOptions = {},
): Promise<GameState> {
	const cappedMs = Math.min(Math.max(0, elapsedMs), MAX_OFFLINE_MS);
	const targetTicks = Math.floor(cappedMs / TICK_MS);
	if (targetTicks <= 0) return state;

	const yieldEvery = options.yieldEveryNEvents ?? 50;
	const w = cloneForAdvance(state);
	const startTick = w.meta.tickCount;
	const endTick = startTick + targetTicks;
	const fights = new HeadlessFights(
		options.fightCache === false ? null : new Map(),
	);

	// A squad caught mid-fight has no deadline to jump to, so its battle restarts
	// here; the seed derives from state, so it is the same one.
	for (const squad of w.squads) {
		if (squad.state !== "fighting" || !squad.targetDungeonId) continue;
		const dungeon = w.dungeons.find((d) => d.id === squad.targetDungeonId);
		if (dungeon && DUNGEON_DEFS[dungeon.id]) {
			fights.begin(w, squad, dungeon, startTick);
		}
	}

	const initial = { ...w.resources };
	function buildStats(eventsProcessed: number): CatchupStats {
		const gained = zeroResources();
		for (const key of RESOURCE_KEYS) {
			gained[key] = Math.floor(w.resources[key] - initial[key]);
		}
		return { eventsProcessed, gained };
	}

	let events = 0;
	while (w.meta.tickCount < endTick) {
		const deadline = nextDeadline(w, fights);
		const next = Math.min(deadline, endTick);
		// Deadlines are strictly in the future, so one at the cursor was missed.
		if (next <= w.meta.tickCount) break;

		const simulatedBefore = fights.simulated;
		advance(w, next, fights);
		if (next === deadline) events++;

		// A cache miss ran a whole fight synchronously, stalling the overlay.
		if (fights.simulated > simulatedBefore || events % yieldEvery === 0) {
			options.onProgress?.(
				w.meta.tickCount - startTick,
				targetTicks,
				buildStats(events),
			);
			await new Promise<void>((r) => setTimeout(r, 0));
		}
	}

	options.onProgress?.(targetTicks, targetTicks, buildStats(events));
	return w;
}
