import { DUNGEON_DEFS } from "./data/dungeons";
import { TICKS_PER_DAY } from "./data/pacing";
import { resolveFightOutcome } from "./rules/fight";
import { accrueFreePulls } from "./rules/gacha";
import { accruePassive, depositLoot, shouldAutoDeploy } from "./rules/loot";
import { deriveFightSeed, lootRand } from "./rules/seeds";
import { dungeonOccupancy } from "./rules/squads";
import { travelLegTicks } from "./rules/travel";
import { checkUnlockConditions } from "./rules/unlocks";
import type { CombatOutcome, DungeonState, GameState, Squad } from "./types";

/**
 * The squad state machine, shared by both paths: the live tick calls `advance`
 * for one tick, offline catchup for a whole span between deadlines. Everything
 * mutates the draft it is handed and never `derived`; cloning is the caller's
 * job. The one asymmetry is `FightDriver`, who decides a fight is over.
 */

export interface FightDriver {
	/** Tick the fight ends, or null on the live path where the engine decides. */
	begin(
		state: GameState,
		squad: Squad,
		dungeon: DungeonState,
		atTick: number,
	): number | null;
	outcomeAt(squadId: string, tick: number): CombatOutcome | null;
	/** Earliest scheduled fight end, or Infinity when none is pending. */
	nextEndTick(): number;
}

export const LIVE_FIGHTS: FightDriver = {
	begin: () => null,
	outcomeAt: () => null,
	nextEndTick: () => Number.POSITIVE_INFINITY,
};

/** A working copy of exactly the slices `advance` writes; `derived` is shared. */
export function cloneForAdvance(state: GameState): GameState {
	return {
		...state,
		resources: { ...state.resources },
		squads: state.squads.map((s) => ({
			...s,
			composition: { ...s.composition },
			roster: { ...s.roster },
			pendingLoot: s.pendingLoot ? { ...s.pendingLoot } : null,
		})),
		dungeons: state.dungeons.map((d) => ({ ...d })),
		gacha: { ...state.gacha },
		meta: { ...state.meta },
	};
}

/** The next tick anything is due; catchup advances to this and no further. */
export function nextDeadline(state: GameState, fights: FightDriver): number {
	let earliest = fights.nextEndTick();
	for (const squad of state.squads) {
		if (squad.phaseEndTick !== undefined && squad.phaseEndTick < earliest) {
			earliest = squad.phaseEndTick;
		}
	}
	return earliest;
}

/**
 * Turn a decided fight into state: survivors, loot, the clear, and the walk home.
 * `"removed"` means the squad was wiped with nothing undying left and is already
 * out of `draft.squads`.
 */
export function applyFightResolution(
	draft: GameState,
	squad: Squad,
	dungeon: DungeonState,
	outcome: CombatOutcome,
	atTick: number,
): "returning" | "removed" {
	const def = DUNGEON_DEFS[dungeon.id];
	const res = resolveFightOutcome(
		squad.composition,
		def,
		dungeon.clearCount,
		outcome,
		draft.derived,
		lootRand(squad.id, dungeon.id, dungeon.clearCount),
	);

	if (res.kind === "destroyed") {
		draft.squads = draft.squads.filter((s) => s.id !== squad.id);
		return "removed";
	}

	squad.composition = res.composition;
	squad.pendingLoot = res.loot;
	squad.manualRecall = res.suppressAutoDeploy;
	squad.state = "returning";
	squad.phaseStartTick = atTick;
	squad.phaseEndTick =
		atTick + travelLegTicks(def, draft.derived.squadTravelSpeedBonus);

	if (res.kind === "cleared") dungeon.clearCount += 1;
	return "returning";
}

/**
 * Advance `draft` from `meta.tickCount` to `toTick`, which must be later and must
 * not step over a deadline (see `nextDeadline`). Everything paid across the span
 * is batchable, so one call for N ticks lands where N calls for one land.
 */
export function advance(
	draft: GameState,
	toTick: number,
	fights: FightDriver,
): void {
	const span = toTick - draft.meta.tickCount;
	if (span <= 0) return;
	const derived = draft.derived;

	accruePassive(draft.resources, derived, span);
	Object.assign(
		draft.gacha,
		accrueFreePulls(draft.gacha, derived.phylactery, span),
	);

	// Pass 1: every transition due at `toTick`, in squad order.
	// `applyFightResolution` filters a wiped squad out of `draft.squads`; the loop
	// keeps walking the array it started on.
	const arrivedHome: Squad[] = [];

	for (const squad of draft.squads) {
		const def = squad.targetDungeonId
			? DUNGEON_DEFS[squad.targetDungeonId]
			: undefined;
		const dungeon = draft.dungeons.find((d) => d.id === squad.targetDungeonId);
		if (!def || !dungeon) continue;

		const due =
			squad.phaseEndTick !== undefined && squad.phaseEndTick <= toTick;

		if (squad.state === "fighting") {
			const outcome = fights.outcomeAt(squad.id, toTick);
			if (outcome) {
				applyFightResolution(draft, squad, dungeon, outcome, toTick);
			}
		} else if (squad.state === "traveling" && due) {
			squad.state = "fighting";
			squad.phaseStartTick = toTick;
			// Derived from state, so a window ending mid-fight resumes the same battle.
			squad.fightSeed = deriveFightSeed(
				def.id,
				squad.composition,
				dungeon.clearCount,
			);
			// No deadline while fighting: no state can say "decided but not applied".
			squad.phaseEndTick = undefined;
			fights.begin(draft, squad, dungeon, toTick);
		} else if (squad.state === "returning" && due) {
			if (squad.pendingLoot) {
				depositLoot(draft.resources, squad.pendingLoot, derived);
			}
			squad.pendingLoot = null;
			squad.state = "idle";
			squad.phaseStartTick = undefined;
			squad.phaseEndTick = undefined;
			arrivedHome.push(squad);
		}
	}

	// Pass 2: only one squad may hold a dungeon, so an arrival sees the claims of
	// squads that landed alongside it. `draft.squads` order settles the tie.
	const occupied = dungeonOccupancy(draft.squads);
	for (const squad of arrivedHome) {
		const dungeon = draft.dungeons.find((d) => d.id === squad.targetDungeonId);
		// Read before clearing: the flag describes the trip that just ended.
		const redeploy = shouldAutoDeploy(derived, squad, dungeon, occupied);
		squad.manualRecall = false;
		if (!redeploy || squad.targetDungeonId === null) continue;

		const def = DUNGEON_DEFS[squad.targetDungeonId];
		if (!def) continue;
		squad.state = "traveling";
		squad.phaseStartTick = toTick;
		squad.phaseEndTick =
			toTick + travelLegTicks(def, derived.squadTravelSpeedBonus);
		occupied.add(squad.targetDungeonId);
	}

	// Safe after the redeploy: unlocks are one-way and turn only on clear counts.
	draft.dungeons = checkUnlockConditions(draft.dungeons);

	draft.meta.tickCount = toTick;
	draft.meta.dayCount = Math.floor(toTick / TICKS_PER_DAY);
}
