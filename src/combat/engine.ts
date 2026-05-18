import type { Side, SideConfig, EngineOptions, CombatEvent, DeathFlash } from './types';
import { EventQueue } from './events';
import { type TierAState, type PerfStats, createTierAState, spawnUnitsA, tickTierA, getCountsA, getTotalCountA } from './tierA';
import { renderFrame } from './renderer';
import { COMBAT_CONFIG } from './config';
import { mulberry32 } from './prng';

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
  };
}

export class CombatEngine {
  private width: number;
  private height: number;
  private configs: Partial<Record<Side, SideConfig>> = {};
  private tierAState: TierAState;
  private events: EventQueue;
  private deathFlashes: DeathFlash[] = [];
  private t: number = 0;
  private running: boolean = false;
  private winner: Side | 'draw' | null = null;
  private nextId: number = 1;
  private rand: () => number;

  // INSTRUMENTATION: per-engine performance counters. Reset on start().
  public stats: EngineStats = createEmptyStats();

  constructor(options: EngineOptions) {
    this.width = options.width;
    this.height = options.height;
    this.rand = options.seed !== undefined ? mulberry32(options.seed) : Math.random;
    this.tierAState = createTierAState();
    this.events = new EventQueue();
  }

  setSide(side: Side, config: SideConfig): void {
    this.configs[side] = config;
  }

  start(): void {
    this.tierAState = createTierAState();
    this.events = new EventQueue();
    this.deathFlashes = [];
    this.t = 0;
    this.winner = null;
    this.nextId = 1;
    this.stats = createEmptyStats();

    for (const side of ['a', 'b'] as Side[]) {
      const config = this.configs[side];
      if (!config) continue;
      const result = spawnUnitsA(config, side, this.nextId, this.rand);
      this.tierAState.units.push(...result.units);
      this.nextId = result.nextId;
    }

    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  tick(deltaMs: number): void {
    if (!this.running || this.winner !== null) return;
    const wallStart = performance.now();
    const dt = deltaMs / 1000;
    this.t += deltaMs;

    tickTierA(
      this.tierAState,
      dt,
      this.events,
      this.t,
      this.width,
      this.height,
      this.stats,
    );

    for (const ev of this.events.drainFlash()) {
      if (ev.type === 'kill') {
        this.deathFlashes.push({ x: ev.x, y: ev.y, t: this.t, side: ev.side });
      }
    }

    const flashMs = COMBAT_CONFIG.rendering.deathFlashMs;
    this.deathFlashes = this.deathFlashes.filter(f => this.t - f.t < flashMs);

    const countA = getTotalCountA(this.tierAState, 'a');
    const countB = getTotalCountA(this.tierAState, 'b');
    if (countA <= 0 && countB <= 0) {
      this.winner = 'draw';
      this.events.emit({ type: 'battle_end', winner: 'draw', t: this.t });
    } else if (countA <= 0) {
      this.winner = 'b';
      this.events.emit({ type: 'battle_end', winner: 'b', t: this.t });
    } else if (countB <= 0) {
      this.winner = 'a';
      this.events.emit({ type: 'battle_end', winner: 'a', t: this.t });
    }

    this.stats.numTicks++;
    this.stats.simTimeMs += deltaMs;
    this.stats.wallTimeMs += performance.now() - wallStart;
  }

  render(ctx: CanvasRenderingContext2D, extrapolationDt: number = 0): void {
    renderFrame(ctx, this.width, this.height, this.tierAState.units, this.configs, this.deathFlashes, this.t, extrapolationDt);
  }

  getCounts(): Record<Side, Record<string, number>> {
    return {
      a: getCountsA(this.tierAState, 'a'),
      b: getCountsA(this.tierAState, 'b'),
    };
  }

  drainEvents(): CombatEvent[] { return this.events.drain(); }

  getWinner(): Side | 'draw' | null { return this.winner; }

  getTotalCount(side: Side): number { return getTotalCountA(this.tierAState, side); }

  getT(): number { return this.t; }
}