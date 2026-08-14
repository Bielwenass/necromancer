import type { CombatEngine } from "../../combat/engine";
import { applyFightResolution, cloneForAdvance } from "../advance";
import { DUNGEON_DEFS } from "../data/dungeons";
import { beginLiveFights, stepLiveFights } from "../liveFights";
import { recomputeDerived } from "../rules/derived";
import { travelLegTicks } from "../rules/travel";
import { makeDungeonState } from "../rules/unlocks";
import { gameTick } from "../tick";
import type { GameState } from "../types";

/**
 * A necromancer strong enough to clear the opening dungeon without losses, with
 * auto-deploy on so a squad cycles travel → fight → return → travel for a whole
 * window. Past one squad they muster on the same dungeon, so they arrive home on
 * the same tick and contend for it.
 */
export function buildScenario(dispatched: boolean, squadCount = 1): GameState {
	const base: Omit<GameState, "derived"> = {
		resources: { bones: 1000, souls: 0, dust: 0, corpses: 0, banners: 0 },
		units: { skeleton: 40, zombie: 0, wraith: 0 },
		squads: Array.from({ length: squadCount }, (_, i) => ({
			id: `S-0${i + 1}`,
			name: `Parity ${i + 1}`,
			composition: { skeleton: 30, zombie: 0, wraith: 0 },
			roster: { skeleton: 30, zombie: 0, wraith: 0 },
			targetDungeonId: null,
			state: "idle" as const,
			pendingLoot: null,
		})),
		dungeons: Object.values(DUNGEON_DEFS).map((def) =>
			makeDungeonState(def, def.id === "paupers-tomb"),
		),
		relics: { inventory: [], equipped: {} },
		// c1 auto-deploy, s* squad size/count, n2/n5 the gates, n4/n7 the amplifiers.
		upgrades: {
			purchased: [
				"c1",
				"c2",
				"s1",
				"s2",
				"s3",
				"s5",
				"n1",
				"n2",
				"n4",
				"n5",
				"n7",
			],
		},
		gacha: {
			pityCounters: { banner: 0, carrion: 0, forbidden: 0 },
			lastPulledRelics: null,
			freePulls: 0,
			freePullTicks: 0,
		},
		workshop: {
			skeleton: { hp: 12, dmg: 12, speed: 4 },
			zombie: { hp: 0, dmg: 0, speed: 0 },
			wraith: { hp: 0, dmg: 0, speed: 0 },
			crypt: { squadSize: 5, travelSpeed: 2 },
			garden: { bones: 3, souls: 1, dust: 0, corpses: 2 },
		},
		meta: { tickCount: 0, dayCount: 0, version: 1, lastTickAt: 0 },
	};
	const state = { ...base, derived: recomputeDerived(base as GameState) };

	// Dispatched after `derived` exists, a leg's length depending on it.
	if (dispatched) {
		const legTicks = travelLegTicks(
			DUNGEON_DEFS["paupers-tomb"],
			state.derived.squadTravelSpeedBonus,
		);
		for (const squad of state.squads) {
			squad.targetDungeonId = "paupers-tomb";
			squad.state = "traveling";
			squad.phaseStartTick = 0;
			squad.phaseEndTick = legTicks;
		}
	}
	return state;
}

/**
 * The live loop, headless: what `useGameLifecycle` runs each interval minus React
 * and the store. Every line of simulation is the shipped one.
 */
export function runLive(start: GameState, ticks: number): GameState {
	let state = start;
	const engines = new Map<string, CombatEngine>();

	for (let i = 0; i < ticks; i++) {
		state = { ...state, ...gameTick(state) };

		for (const f of stepLiveFights(
			engines,
			state.derived.combatSpeedMultiplier,
		)) {
			engines.delete(f.squadId);
			state = applyLiveFight(state, f.squadId, f.winner, f.survivorsByType);
		}

		for (const [squadId, engine] of beginLiveFights(state, engines)) {
			engines.set(squadId, engine);
		}
	}
	return state;
}

/**
 * `squadSlice.resolveFight`, applied to a plain state. It installs the same
 * slices the action does and no more; returning the whole draft would hide a
 * write the action drops, the one thing this harness exists to catch.
 */
function applyLiveFight(
	state: GameState,
	squadId: string,
	winner: "a" | "b" | "draw",
	survivorsByType: Record<string, number>,
): GameState {
	const current = state.squads.find((s) => s.id === squadId);
	if (current?.state !== "fighting" || !current.targetDungeonId) return state;

	const draft = cloneForAdvance(state);
	const squad = draft.squads.find((s) => s.id === squadId);
	const dungeon = draft.dungeons.find((d) => d.id === current.targetDungeonId);
	if (!squad || !dungeon || !DUNGEON_DEFS[dungeon.id]) return state;

	applyFightResolution(
		draft,
		squad,
		dungeon,
		{ winner, survivorsByType },
		state.meta.tickCount,
	);
	return { ...state, squads: draft.squads, dungeons: draft.dungeons };
}

/** The world minus `lastTickAt` (a wall clock) and `derived` (a projection). */
export function worldOf(state: GameState): Record<string, unknown> {
	return {
		resources: state.resources,
		squads: state.squads,
		dungeons: state.dungeons,
		gacha: state.gacha,
		tickCount: state.meta.tickCount,
		dayCount: state.meta.dayCount,
	};
}

export const totalClears = (state: GameState) =>
	state.dungeons.reduce((n, d) => n + d.clearCount, 0);

export const unlockedIds = (state: GameState) =>
	state.dungeons
		.filter((d) => d.unlocked)
		.map((d) => d.id)
		.sort();

export const clearsById = (state: GameState) =>
	Object.fromEntries(state.dungeons.map((d) => [d.id, d.clearCount]));

export const bannersEarned = (state: GameState) =>
	state.dungeons.reduce(
		(n, d) => n + d.clearCount * DUNGEON_DEFS[d.id].tier,
		0,
	);

export const bannersPaid = (state: GameState) =>
	state.squads.reduce(
		(n, s) => n + (s.pendingLoot?.banners ?? 0),
		state.resources.banners,
	);
