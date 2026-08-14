import { ENGINE_DT, MAX_FIGHT_MS } from "../game/data/pacing";
import { COMBAT_CONFIG } from "./config";
import { EventQueue } from "./events";
import { mulberry32 } from "./prng";
import { renderFrame } from "./renderer";
import {
	createSimState,
	finalizeSpawn,
	getTotalUnitCount,
	getUnitCounts,
	leadingSide,
	type PerfStats,
	type SimState,
	spawnUnits,
	tickSimulation,
} from "./simulation";
import type {
	CombatEvent,
	DeathFlash,
	EngineOptions,
	Side,
	SideConfig,
} from "./types";

export interface EngineStats extends PerfStats {
	numTicks: number;
	simTimeMs: number;
	wallTimeMs: number;
}

function createEmptyStats(): EngineStats {
	return {
		numTicks: 0,
		simTimeMs: 0,
		wallTimeMs: 0,
		hashBuildMs: 0,
		accelMs: 0,
		collisionMs: 0,
		damageMs: 0,
		queryMs: 0,
		neighborLoopMs: 0,
		seekFallbackMs: 0,
		integrateMs: 0,
		neighborsVisited: 0,
		queryCalls: 0,
		maxNeighbors: 0,
		unitsProcessed: 0,
	};
}

export class CombatEngine {
	private width: number;
	private height: number;
	private configs: Partial<Record<Side, SideConfig>> = {};
	private simState: SimState;
	private events: EventQueue;
	private deathFlashes: DeathFlash[] = [];
	private t: number = 0;
	/** Sim time fed in but not yet worth a whole `ENGINE_DT` step. */
	private carryMs: number = 0;
	private running: boolean = false;
	private winner: Side | "draw" | null = null;
	private nextId: number = 1;
	private rand: () => number;

	public stats: EngineStats = createEmptyStats();

	constructor(options: EngineOptions) {
		this.width = options.width;
		this.height = options.height;
		this.rand =
			options.seed !== undefined ? mulberry32(options.seed) : Math.random;
		this.simState = createSimState();
		this.events = new EventQueue();
	}

	setSide(side: Side, config: SideConfig): void {
		this.configs[side] = config;
	}

	start(): void {
		this.simState = createSimState();
		this.events = new EventQueue();
		this.deathFlashes = [];
		this.t = 0;
		this.carryMs = 0;
		this.winner = null;
		this.nextId = 1;
		this.stats = createEmptyStats();

		for (const side of ["a", "b"] as Side[]) {
			const config = this.configs[side];
			if (!config) continue;
			const result = spawnUnits(config, side, this.nextId, this.rand);
			this.simState.units.push(...result.units);
			this.nextId = result.nextId;
		}
		finalizeSpawn(this.simState, this.rand);

		this.running = true;
	}

	stop(): void {
		this.running = false;
	}

	/**
	 * Advance the fight by `deltaMs`, always in whole `ENGINE_DT` steps, carrying
	 * the remainder into the next call rather than taking a short step. That is
	 * what lets one seed produce one fight whoever is driving: the live loop feeds
	 * 100ms per game tick, not a multiple of the step, and without the carry would
	 * diverge from a headless run. A driver feeding exact steps accumulates no
	 * carry, so nothing it measures moves.
	 */
	tick(deltaMs: number): void {
		if (!this.running || this.winner !== null) return;
		const wallStart = performance.now();

		this.carryMs += deltaMs;
		const steps = Math.floor(this.carryMs / ENGINE_DT);
		if (steps <= 0) return;
		this.carryMs -= steps * ENGINE_DT;

		const dt = ENGINE_DT / 1000;
		for (let i = 0; i < steps && this.winner === null; i++) {
			this.t += ENGINE_DT;
			tickSimulation(
				this.simState,
				dt,
				this.events,
				this.t,
				this.width,
				this.height,
				this.stats,
			);
			this.settleFrame();
		}

		this.stats.wallTimeMs += performance.now() - wallStart;
	}

	/** Post-step bookkeeping: death flashes, then the win check. */
	private settleFrame(): void {
		for (const ev of this.events.drainFlash()) {
			if (ev.type === "kill") {
				this.deathFlashes.push({ x: ev.x, y: ev.y, t: this.t, side: ev.side });
			}
		}

		const flashMs = COMBAT_CONFIG.rendering.deathFlashMs;
		this.deathFlashes = this.deathFlashes.filter((f) => this.t - f.t < flashMs);

		const countA = getTotalUnitCount(this.simState, "a");
		const countB = getTotalUnitCount(this.simState, "b");
		if (countA <= 0 && countB <= 0) {
			this.winner = "draw";
			this.events.emit({ type: "battle_end", winner: "draw", t: this.t });
		} else if (countA <= 0) {
			this.winner = "b";
			this.events.emit({ type: "battle_end", winner: "b", t: this.t });
		} else if (countB <= 0) {
			this.winner = "a";
			this.events.emit({ type: "battle_end", winner: "a", t: this.t });
		} else if (this.t >= MAX_FIGHT_MS) {
			// Neither side is gone and the fight has run its length. Call it on the
			// share of each muster still standing rather than letting it grind on —
			// a squad stuck in `fighting` forever never comes home.
			this.winner = leadingSide(this.simState);
			this.events.emit({
				type: "battle_end",
				winner: this.winner,
				t: this.t,
			});
		}

		this.stats.numTicks++;
		this.stats.simTimeMs += ENGINE_DT;
	}

	render(ctx: CanvasRenderingContext2D, extrapolationDt: number = 0): void {
		renderFrame(
			ctx,
			this.width,
			this.height,
			this.simState.units,
			this.configs,
			this.deathFlashes,
			this.t,
			extrapolationDt,
		);
	}

	getCounts(): Record<Side, Record<string, number>> {
		return {
			a: getUnitCounts(this.simState, "a"),
			b: getUnitCounts(this.simState, "b"),
		};
	}

	drainEvents(): CombatEvent[] {
		return this.events.drain();
	}

	getWinner(): Side | "draw" | null {
		return this.winner;
	}

	getTotalCount(side: Side): number {
		return getTotalUnitCount(this.simState, side);
	}

	getT(): number {
		return this.t;
	}
}
