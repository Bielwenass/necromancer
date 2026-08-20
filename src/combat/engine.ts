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
	type StatsLevel,
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

function createEmptyStats(detail: boolean): EngineStats {
	return {
		detail,
		numTicks: 0,
		simTimeMs: 0,
		wallTimeMs: 0,
		gridBuildMs: 0,
		accelMs: 0,
		damageMs: 0,
		fineBuildMs: 0,
		cellBuildMs: 0,
		neighborMs: 0,
		seekMs: 0,
		integrateMs: 0,
		neighborsVisited: 0,
		separationPairs: 0,
		collisionPairs: 0,
		acquisitions: 0,
		acquireScanned: 0,
		contactSwaps: 0,
		swings: 0,
		overlapDepth: 0,
		engagedSpeed: 0,
		engagedUnits: 0,
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
	private carryMs: number = 0;
	private running: boolean = false;
	private winner: Side | "draw" | null = null;
	private nextId: number = 1;
	private rand: () => number;
	/** Timing is off by default: at `detail` it costs six timers per unit per tick. */
	private statsLevel: StatsLevel;
	private liveCounts: Record<Side, number> = { a: 0, b: 0 };

	public stats: EngineStats;

	constructor(options: EngineOptions) {
		this.width = options.width;
		this.height = options.height;
		this.rand =
			options.seed !== undefined ? mulberry32(options.seed) : Math.random;
		this.statsLevel = options.stats ?? "off";
		this.stats = createEmptyStats(this.statsLevel === "detail");
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
		this.stats = createEmptyStats(this.statsLevel === "detail");

		for (const side of ["a", "b"] as Side[]) {
			const config = this.configs[side];
			if (!config) continue;
			this.nextId = spawnUnits(
				this.simState,
				config,
				side,
				this.nextId,
				this.rand,
			);
		}
		finalizeSpawn(this.simState, this.rand);
		this.liveCounts = {
			a: getTotalUnitCount(this.simState, "a"),
			b: getTotalUnitCount(this.simState, "b"),
		};

		this.running = true;
	}

	stop(): void {
		this.running = false;
	}

	/**
	 * Advance the fight by `deltaMs`, always in whole `ENGINE_DT` steps, carrying
	 * the remainder. That is what lets one seed produce one fight whoever is
	 * driving: the live loop feeds 100ms per game tick, which is not a multiple of
	 * the step, while a driver feeding exact steps carries nothing.
	 */
	tick(deltaMs: number): void {
		if (!this.running || this.winner !== null) return;
		const wallStart = performance.now();

		this.carryMs += deltaMs;
		const steps = Math.floor(this.carryMs / ENGINE_DT);
		if (steps <= 0) return;
		this.carryMs -= steps * ENGINE_DT;

		const dt = ENGINE_DT / 1000;
		const stats = this.statsLevel === "off" ? undefined : this.stats;
		for (let i = 0; i < steps && this.winner === null; i++) {
			this.t += ENGINE_DT;
			this.liveCounts = tickSimulation(
				this.simState,
				dt,
				this.events,
				this.t,
				this.width,
				this.height,
				stats,
			);
			this.settleFrame();
		}

		this.stats.wallTimeMs += performance.now() - wallStart;
	}

	private settleFrame(): void {
		for (const ev of this.events.drainFlash()) {
			if (ev.type === "kill") {
				this.deathFlashes.push({ x: ev.x, y: ev.y, t: this.t, side: ev.side });
			}
		}

		const flashMs = COMBAT_CONFIG.rendering.deathFlashMs;
		this.deathFlashes = this.deathFlashes.filter((f) => this.t - f.t < flashMs);

		const countA = this.liveCounts.a;
		const countB = this.liveCounts.b;
		if (countA <= 0 || countB <= 0) {
			this.winner = countA > 0 ? "a" : countB > 0 ? "b" : "draw";
		} else if (this.t >= MAX_FIGHT_MS) {
			// Neither side is gone and the fight has run its length, so it is called
			// on the share of each muster standing; a squad stuck in `fighting` never
			// comes home.
			this.winner = leadingSide(this.simState);
		}
		// Reached with a null winner, so a decision here is a new one.
		if (this.winner !== null) {
			this.events.emit({ type: "battle_end", winner: this.winner, t: this.t });
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
			this.simState.typeNames,
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
