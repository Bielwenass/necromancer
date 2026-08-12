import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import { mulberry32 } from "../combat/prng";
import { DUNGEON_DEFS } from "./data/dungeons";
import {
	ENGINE_DT,
	MAX_HEADLESS_TICKS,
	MAX_OFFLINE_MS,
	TICK_MS,
	TICKS_PER_DAY,
} from "./data/pacing";
import { resolveFightOutcome } from "./rules/fight";
import { accruePassive, depositLoot, shouldAutoDeploy } from "./rules/loot";
import { effectiveTravelTicks } from "./rules/travel";
import { squadSize } from "./rules/units";
import { checkUnlockConditions } from "./rules/unlocks";
import type { CombatOutcome, GameState, Squad } from "./types";

// ── Types ────────────────────────────────────────────────────

type FightOutcome = CombatOutcome & {
	/** Game ticks, factoring `derived.combatSpeedMultiplier`. */
	durationTicks: number;
};

type EventKind = "outboundArrive" | "fightDone" | "returnArrive";

type SquadEvent = {
	kind: EventKind;
	ticksUntil: number;
	squadId: string;
};

// Transient catchup-internal fields. Stripped before simulateOffline returns.
type WorkingSquad = Squad & {
	_phaseStart?: number;
	_phaseEnd?: number;
};

export interface CatchupStats {
	eventsProcessed: number;
	bonesGained: number;
	soulsGained: number;
}

export interface CatchupOptions {
	/** Yield to the event loop every N events processed. Default 50. */
	yieldEveryNEvents?: number;
	/** Progress callback for the catchup overlay UI. */
	onProgress?: (cursor: number, target: number, stats?: CatchupStats) => void;
}

// ── Min-heap (binary) ────────────────────────────────────────

class MinHeap<T> {
	private items: T[] = [];
	constructor(private cmp: (a: T, b: T) => number) {}

	get size(): number {
		return this.items.length;
	}

	push(item: T): void {
		this.items.push(item);
		let i = this.items.length - 1;
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (this.cmp(this.items[i], this.items[p]) >= 0) break;
			[this.items[i], this.items[p]] = [this.items[p], this.items[i]];
			i = p;
		}
	}

	pop(): T | undefined {
		const n = this.items.length;
		if (n === 0) return undefined;
		const top = this.items[0];
		const last = this.items[n - 1];
		this.items.length = n - 1;
		if (n > 1) {
			this.items[0] = last;
			let i = 0;
			const len = this.items.length;
			while (true) {
				const l = 2 * i + 1,
					r = 2 * i + 2;
				let m = i;
				if (l < len && this.cmp(this.items[l], this.items[m]) < 0) m = l;
				if (r < len && this.cmp(this.items[r], this.items[m]) < 0) m = r;
				if (m === i) break;
				[this.items[i], this.items[m]] = [this.items[m], this.items[i]];
				i = m;
			}
		}
		return top;
	}
}

// ── Helpers ──────────────────────────────────────────────────

// FNV-1a-ish 32-bit hash. Used for deterministic per-fight seeds.
function hashSeed(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function deriveFightSeed(
	squadId: string,
	dungeonId: string,
	clearCount: number,
): number {
	return hashSeed(`${squadId}|${dungeonId}|${clearCount}`);
}

// Stable composition signature for cache keys. Zero counts are dropped so
// different "shapes" of zero compositions still cache together correctly.
function compositionSig(c: Record<string, number>): string {
	const keys = Object.keys(c)
		.filter((k) => c[k] > 0)
		.sort();
	return keys.map((k) => `${k}:${c[k]}`).join("|");
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

function computeTravelTime(state: GameState, dungeonId: string): number {
	const def = DUNGEON_DEFS[dungeonId];
	if (!def) return Infinity;
	return effectiveTravelTicks(def, state.derived.squadTravelSpeedBonus);
}

// ── Fight resolution ─────────────────────────────────────────

function runFight(
	state: GameState,
	squad: Squad,
	dungeon: { id: string; clearCount: number },
	cache: Map<string, FightOutcome>,
): FightOutcome {
	// Empty squad loses instantly without engine cost.
	if (squadSize(squad.composition) === 0) {
		return { winner: "b", survivorsByType: {}, durationTicks: 1 };
	}

	const cacheKey = `${dungeon.id}|${compositionSig(squad.composition)}`;
	const cached = cache.get(cacheKey);
	if (cached) return cached;

	const seed = deriveFightSeed(squad.id, dungeon.id, dungeon.clearCount);
	const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed });
	engine.setSide("a", buildAttackerConfig(squad.composition, state.derived));
	engine.setSide("b", buildDefenderConfig(DUNGEON_DEFS[dungeon.id]));
	engine.start();

	let safety = 0;
	while (engine.getWinner() === null && safety < MAX_HEADLESS_TICKS) {
		engine.tick(ENGINE_DT);
		safety++;
	}

	const winner = (engine.getWinner() ?? "draw") as "a" | "b" | "draw";
	const counts = engine.getCounts();
	const survivorsByType = winner === "a" ? counts.a : {};

	// engine.getT() is sim time in ms. Divide by combatSpeedMultiplier to get
	// wall-clock time the player would have waited, then convert to game ticks.
	const csm = state.derived.combatSpeedMultiplier || 1;
	const durationTicks = Math.max(1, Math.ceil(engine.getT() / (TICK_MS * csm)));

	const outcome: FightOutcome = { winner, survivorsByType, durationTicks };

	// Cache only lossless wins — exactly the "always-wins" case.
	if (winner === "a" && isLossless(squad.composition, survivorsByType)) {
		cache.set(cacheKey, outcome);
	}
	return outcome;
}

// ── Event scheduling ─────────────────────────────────────────

function initialEvent(
	squad: WorkingSquad,
	state: GameState,
	cursor: number,
): SquadEvent | null {
	if (!squad.targetDungeonId) return null;
	if (!DUNGEON_DEFS[squad.targetDungeonId]) return null;

	switch (squad.state) {
		case "idle":
			return null;

		case "traveling": {
			// Trip started in the past (relative to cursor=0). Reconstruct
			// _phaseStart so interpolation works if catchup ends mid-trip.
			const tt = computeTravelTime(state, squad.targetDungeonId);
			const remaining = (1 - squad.position) * tt;
			squad._phaseStart = cursor - squad.position * tt;
			squad._phaseEnd = cursor + remaining;
			return {
				kind: "outboundArrive",
				ticksUntil: cursor + remaining,
				squadId: squad.id,
			};
		}

		case "fighting":
			// Fight was in progress when the player left — resolve immediately.
			// _phaseStart/_phaseEnd will be set by processEvent.
			return { kind: "outboundArrive", ticksUntil: cursor, squadId: squad.id };

		case "returning": {
			const tt = computeTravelTime(state, squad.targetDungeonId);
			const remaining = squad.position * tt;
			squad._phaseStart = cursor - (1 - squad.position) * tt;
			squad._phaseEnd = cursor + remaining;
			return {
				kind: "returnArrive",
				ticksUntil: cursor + remaining,
				squadId: squad.id,
			};
		}

		default:
			return null;
	}
}

function processEvent(
	state: GameState,
	event: SquadEvent,
	cursor: number,
	cache: Map<string, FightOutcome>,
): SquadEvent | null {
	const squad = state.squads.find((s) => s.id === event.squadId) as
		| WorkingSquad
		| undefined;
	if (!squad?.targetDungeonId) return null;
	const dungeon = state.dungeons.find((d) => d.id === squad.targetDungeonId);
	if (!dungeon) return null;

	switch (event.kind) {
		case "outboundArrive": {
			// Mirror tick.ts on arrival: reset position, enter fighting.
			squad.position = 0;
			squad.state = "fighting";

			// If the dungeon vanished or locked since the squad left, bail.
			if (!dungeon.unlocked) {
				squad.state = "returning";
				squad.position = 1;
				const tt = computeTravelTime(state, squad.targetDungeonId);
				squad._phaseStart = cursor;
				squad._phaseEnd = cursor + tt;
				return {
					kind: "returnArrive",
					ticksUntil: cursor + tt,
					squadId: squad.id,
				};
			}

			const outcome = runFight(state, squad, dungeon, cache);

			// From here the rules are `resolveFightOutcome`, shared with the live
			// store action. Catchup differs only in seeding the loot roll, so a
			// mid-window refresh reproduces the same haul.
			const lootRand = mulberry32(
				deriveFightSeed(squad.id, dungeon.id, dungeon.clearCount) ^ 0xdeadbeef,
			);
			const res = resolveFightOutcome(
				squad.composition,
				DUNGEON_DEFS[dungeon.id],
				dungeon.clearCount,
				outcome,
				state.derived.soulHarvestBonus,
				lootRand,
			);

			// A destroyed squad is removed outright rather than walking an empty
			// squad home, which would leave debris in the Crypt. No further event
			// references it — `processEvent` looks the squad up by id and bails
			// when it is gone.
			if (res.kind === "destroyed") {
				state.squads = state.squads.filter((s) => s.id !== squad.id);
				return null;
			}

			Object.assign(squad.composition, res.composition);
			squad.pendingLoot = res.loot;
			squad.manualRecall = res.suppressAutoDeploy;
			dungeon.clearCount += res.clearCountDelta;
			state.resources.banners += res.bannersAwarded;

			squad._phaseStart = cursor;
			squad._phaseEnd = cursor + outcome.durationTicks;
			return {
				kind: "fightDone",
				ticksUntil: cursor + outcome.durationTicks,
				squadId: squad.id,
			};
		}

		case "fightDone": {
			squad.state = "returning";
			squad.position = 1;
			const tt = computeTravelTime(state, squad.targetDungeonId);
			squad._phaseStart = cursor;
			squad._phaseEnd = cursor + tt;
			return {
				kind: "returnArrive",
				ticksUntil: cursor + tt,
				squadId: squad.id,
			};
		}

		case "returnArrive": {
			if (squad.pendingLoot) {
				depositLoot(state.resources, squad.pendingLoot, state.derived);
			}
			squad.pendingLoot = null;
			squad.state = "idle";
			squad.position = 0;

			// Loot may have triggered new unlocks
			state.dungeons = checkUnlockConditions(state.dungeons);

			// `manualRecall` must be read before being cleared, as it is online: the
			// flag describes the trip that just ended, not the next one.
			const dn = state.dungeons.find((d) => d.id === squad.targetDungeonId);
			const redeploy = shouldAutoDeploy(state.derived, squad, dn);
			squad.manualRecall = false;

			if (redeploy) {
				squad.state = "traveling";
				squad.position = 0;
				const tt = computeTravelTime(state, squad.targetDungeonId);
				squad._phaseStart = cursor;
				squad._phaseEnd = cursor + tt;
				return {
					kind: "outboundArrive",
					ticksUntil: cursor + tt,
					squadId: squad.id,
				};
			}

			squad._phaseStart = undefined;
			squad._phaseEnd = undefined;
			return null;
		}
	}
}

function cloneForCatchup(state: GameState): GameState {
	return {
		...state,
		resources: { ...state.resources },
		squads: state.squads.map((s) => ({
			...s,
			composition: { ...s.composition },
			pendingLoot: s.pendingLoot ? { ...s.pendingLoot } : null,
		})),
		dungeons: state.dungeons.map((d) => ({ ...d })),
		meta: { ...state.meta },
	};
}

// For squads that didn't reach their next event by the time cap, interpolate
// position based on cursor vs phase bounds. Strip transient fields.
function finalizeSquads(state: GameState, cursor: number): void {
	for (const s of state.squads as WorkingSquad[]) {
		if (
			s._phaseStart !== undefined &&
			s._phaseEnd !== undefined &&
			s._phaseEnd > cursor
		) {
			const span = s._phaseEnd - s._phaseStart;
			const frac = span > 0 ? (cursor - s._phaseStart) / span : 0;
			const clamped = Math.max(0, Math.min(1, frac));
			if (s.state === "traveling") s.position = clamped;
			else if (s.state === "returning") s.position = 1 - clamped;
			else s.position = 0;
		}
		s._phaseStart = undefined;
		s._phaseEnd = undefined;
	}
}

// ── Public entry point ───────────────────────────────────────

export async function simulateOffline(
	state: GameState,
	elapsedMs: number,
	options: CatchupOptions = {},
): Promise<GameState> {
	const cappedMs = Math.min(Math.max(0, elapsedMs), MAX_OFFLINE_MS);
	const targetTicks = Math.floor(cappedMs / TICK_MS);
	if (targetTicks <= 0) return state;

	const yieldEvery = options.yieldEveryNEvents ?? 50;
	const w = cloneForCatchup(state);
	const cache = new Map<string, FightOutcome>();
	const heap = new MinHeap<SquadEvent>((a, b) => a.ticksUntil - b.ticksUntil);

	const initialBones = w.resources.bones;
	const initialSouls = w.resources.souls;

	function buildStats(eventsProcessed: number): CatchupStats {
		return {
			eventsProcessed,
			bonesGained: Math.floor(w.resources.bones - initialBones),
			soulsGained: Math.floor(w.resources.souls - initialSouls),
		};
	}

	// Seed initial events for each in-flight squad
	for (const squad of w.squads as WorkingSquad[]) {
		const ev = initialEvent(squad, w, 0);
		if (ev) heap.push(ev);
	}

	let cursor = 0;
	let eventCount = 0;

	while (heap.size > 0 && cursor < targetTicks) {
		const next = heap.pop();
		if (!next) break;
		const advance = Math.min(next.ticksUntil - cursor, targetTicks - cursor);

		if (advance > 0) {
			accruePassive(w.resources, w.derived, advance);
			cursor += advance;
		}

		if (cursor < next.ticksUntil) {
			// Hit the time cap before reaching this event. Re-push for cleanup
			// and break — the squad is mid-phase, finalizeSquads will interpolate.
			heap.push(next);
			break;
		}

		const followup = processEvent(w, next, cursor, cache);
		if (followup) heap.push(followup);

		eventCount++;
		if (eventCount % yieldEvery === 0) {
			options.onProgress?.(cursor, targetTicks, buildStats(eventCount));
			await new Promise<void>((r) => setTimeout(r, 0));
		}
	}

	// Accrue any remaining passive after the last event
	if (cursor < targetTicks) {
		accruePassive(w.resources, w.derived, targetTicks - cursor);
		cursor = targetTicks;
	}

	finalizeSquads(w, cursor);

	w.meta.tickCount += cursor;
	w.meta.dayCount = Math.floor(w.meta.tickCount / TICKS_PER_DAY);
	w.dungeons = checkUnlockConditions(w.dungeons);

	options.onProgress?.(targetTicks, targetTicks, buildStats(eventCount));
	return w;
}
