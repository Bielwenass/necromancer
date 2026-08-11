import {
	buildAttackerConfig,
	COMBAT_H,
	COMBAT_W,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import { mulberry32 } from "../combat/prng";
import { DUNGEON_DEFS } from "./data/dungeons";
import { checkUnlockConditions } from "./dungeons";
import { effectiveSoulChance } from "./tick";
import { effectiveTravelTicks } from "./travel";
import type { GameState, Resources, Squad } from "./types";

// ── Constants ────────────────────────────────────────────────
// Game-tick interval. Derived from your existing TICKS_PER_DAY=1200 over a
// 2-minute in-game day → 100ms per tick.
const TICK_MS = 100;
const ENGINE_DT = 16; // engine fixed timestep, must match the worker
const TICKS_PER_DAY = 1200;
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
const MAX_HEADLESS_TICKS = 20000; // safety cap per fight (~5 min sim time)

// ── Types ────────────────────────────────────────────────────

type FightOutcome = {
	winner: "a" | "b" | "draw";
	survivors: Record<string, number>;
	durationTicks: number; // game ticks, factoring derived.combatSpeedMultiplier
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
	coinsGained: number;
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

function totalUnits(c: Record<string, number>): number {
	let n = 0;
	for (const k of Object.keys(c)) n += c[k];
	return n;
}

// Seeded mirror of tick.ts's generateLoot. The live function uses
// Math.random() (intentionally non-deterministic); catchup needs determinism
// so a mid-window refresh produces identical results.
function generateLootSeeded(
	dungeonId: string,
	clearCount: number,
	soulHarvestBonus: number,
	rand: () => number,
): Partial<Resources> {
	const def = DUNGEON_DEFS[dungeonId];
	if (!def) return {};
	const lt = def.lootTable;
	const clearBonus = 1 + Math.sqrt(clearCount + 1) * 0.07;
	const bones = Math.round(
		(lt.bonesMin + rand() * (lt.bonesMax - lt.bonesMin)) * clearBonus,
	);
	const coins = Math.round(
		(lt.coinsMin + rand() * (lt.coinsMax - lt.coinsMin)) * clearBonus,
	);
	const corpses = Math.round(
		(lt.corpseMin + rand() * (lt.corpseMax - lt.corpseMin)) * clearBonus,
	);
	const souls =
		rand() < effectiveSoulChance(lt.soulChance, soulHarvestBonus) ? 1 : 0;
	return { bones, coins, corpses, souls };
}

// ── Fight resolution ─────────────────────────────────────────

function resolveFight(
	state: GameState,
	squad: Squad,
	dungeon: { id: string; clearCount: number },
	cache: Map<string, FightOutcome>,
): FightOutcome {
	// Empty squad loses instantly without engine cost.
	if (totalUnits(squad.composition) === 0) {
		return { winner: "b", survivors: {}, durationTicks: 1 };
	}

	const cacheKey = `${dungeon.id}|${compositionSig(squad.composition)}`;
	const cached = cache.get(cacheKey);
	if (cached) return cached;

	const attackerConfig = buildAttackerConfig(squad.composition, state.derived);
	const dungeonDef = DUNGEON_DEFS[dungeon.id];
	const defenderConfig = {
		units: dungeonDef.enemies,
		spawnArea: { x: COMBAT_W - 65, y: 10, w: 55, h: COMBAT_H - 20 },
	};

	const seed = deriveFightSeed(squad.id, dungeon.id, dungeon.clearCount);
	const engine = new CombatEngine({ width: COMBAT_W, height: COMBAT_H, seed });
	engine.setSide("a", attackerConfig);
	engine.setSide("b", defenderConfig);
	engine.start();

	let safety = 0;
	while (engine.getWinner() === null && safety < MAX_HEADLESS_TICKS) {
		engine.tick(ENGINE_DT);
		safety++;
	}

	const winner = (engine.getWinner() ?? "draw") as "a" | "b" | "draw";
	const counts = engine.getCounts();
	const survivors = winner === "a" ? counts.a : {};

	// engine.getT() is sim time in ms. Divide by combatSpeedMultiplier to get
	// wall-clock time the player would have waited, then convert to game ticks.
	const csm = state.derived.combatSpeedMultiplier || 1;
	const durationTicks = Math.max(1, Math.ceil(engine.getT() / (TICK_MS * csm)));

	const outcome: FightOutcome = { winner, survivors, durationTicks };

	// Cache only lossless wins — exactly the "always-wins" case.
	if (winner === "a" && isLossless(squad.composition, survivors)) {
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

			const outcome = resolveFight(state, squad, dungeon, cache);

			// A wipe destroys the squad outright, mirroring `resolveFight` — it must
			// not walk an empty squad home, which would leave debris in the Crypt.
			// No further event references it: `processEvent` looks the squad up by
			// id and bails when it is gone.
			if (outcome.winner !== "a") {
				state.squads = state.squads.filter((s) => s.id !== squad.id);
				return null;
			}

			for (const k of Object.keys(squad.composition) as Array<
				keyof typeof squad.composition
			>) {
				squad.composition[k] = outcome.survivors[k] ?? 0;
			}
			const lootRand = mulberry32(
				deriveFightSeed(squad.id, dungeon.id, dungeon.clearCount) ^ 0xdeadbeef,
			);
			squad.pendingLoot = generateLootSeeded(
				dungeon.id,
				dungeon.clearCount,
				state.derived.soulHarvestBonus,
				lootRand,
			);
			dungeon.clearCount++;
			// Clearing pays banners, exactly as `resolveFight` does online.
			state.resources.banners += DUNGEON_DEFS[dungeon.id].tier;

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
			// Deposit loot with yield bonuses
			if (squad.pendingLoot) {
				const l = squad.pendingLoot;
				const r = state.resources;
				r.bones += (l.bones ?? 0) * (1 + state.derived.boneYieldBonus);
				r.coins += (l.coins ?? 0) * (1 + state.derived.coinYieldBonus);
				r.souls += (l.souls ?? 0) * (1 + state.derived.soulsYieldBonus);
				r.corpses += (l.corpses ?? 0) * (1 + state.derived.corpseYieldBonus);
			}
			squad.pendingLoot = null;

			// manualRecall must be read before being cleared, mirroring tick.ts.
			const wasManualRecall = squad.manualRecall;
			squad.manualRecall = false;
			squad.state = "idle";
			squad.position = 0;

			// Loot may have triggered new unlocks
			state.dungeons = checkUnlockConditions(state.dungeons);

			// Auto-deploy if eligible
			if (state.derived.autoDeploy && !wasManualRecall) {
				const dn = state.dungeons.find((d) => d.id === squad.targetDungeonId);
				if (dn?.unlocked && totalUnits(squad.composition) > 0) {
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
			}

			squad._phaseStart = undefined;
			squad._phaseEnd = undefined;
			return null;
		}
	}
}

function accruePassive(state: GameState, ticks: number): void {
	const r = state.resources;
	const d = state.derived;
	r.bones += d.bonesPerTick * ticks;
	r.coins += d.coinsPerTick * ticks;
	r.souls += d.soulsPerTick * ticks;
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
	const initialCoins = w.resources.coins;
	const initialSouls = w.resources.souls;

	function buildStats(eventsProcessed: number): CatchupStats {
		return {
			eventsProcessed,
			bonesGained: Math.floor(w.resources.bones - initialBones),
			coinsGained: Math.floor(w.resources.coins - initialCoins),
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
			accruePassive(w, advance);
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
		accruePassive(w, targetTicks - cursor);
		cursor = targetTicks;
	}

	finalizeSquads(w, cursor);

	w.meta.tickCount += cursor;
	w.meta.dayCount = Math.floor(w.meta.tickCount / TICKS_PER_DAY);
	w.dungeons = checkUnlockConditions(w.dungeons);

	options.onProgress?.(targetTicks, targetTicks, buildStats(eventCount));
	return w;
}
