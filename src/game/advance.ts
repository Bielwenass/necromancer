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
 * here mutates the draft it is handed and never `derived`; cloning is the
 * caller's job.
 *
 * The only asymmetry is who decides a fight is over, and that is the whole of
 * `FightDriver`.
 */

export interface FightDriver {
	/**
	 * A squad reached its dungeon at `atTick`. Returns the tick the fight ends,
	 * or null when only the caller can know — the live path, where the engine the
	 * player is watching decides.
	 */
	begin(
		state: GameState,
		squad: Squad,
		dungeon: DungeonState,
		atTick: number,
	): number | null;
	/** The outcome of a fight this driver scheduled to end at or before `tick`. */
	outcomeAt(squadId: string, tick: number): CombatOutcome | null;
	/** Earliest scheduled fight end, or Infinity when none is pending. */
	nextEndTick(): number;
}

/** Fights are driven from outside `advance`, so it schedules nothing. */
export const LIVE_FIGHTS: FightDriver = {
	begin: () => null,
	outcomeAt: () => null,
	nextEndTick: () => Number.POSITIVE_INFINITY,
};

/**
 * A working copy `advance` may mutate freely — exactly the slices it writes.
 * `derived` is shared by reference because nothing here may touch it.
 */
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

/**
 * The next tick at which anything is due. Offline catchup advances to this and
 * no further, which is what makes a jump indistinguishable from stepping every
 * tick in between.
 */
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
 * Turn a decided fight into state: survivors, haul, the clear, and the walk
 * home. Shared by the live store action and the offline driver.
 *
 * Returns `"removed"` when the squad was wiped with nothing undying left — it
 * has already been dropped from `draft.squads`.
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

	// Removed outright rather than walking an empty squad home.
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
 * Advance `draft` from its current `meta.tickCount` to `toTick`.
 *
 * `toTick` must be greater than the current tick and must not step over a
 * deadline — see `nextDeadline`. Everything paid out across the span is exactly
 * batchable, so one call for N ticks lands where N calls for one would.
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

	// ── Pass 1: every transition due at `toTick`, in squad order ──
	// A squad wiped here is filtered out of `draft.squads` by
	// `applyFightResolution`; the loop keeps walking the array it started on.
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
			// Derived rather than drawn, and stamped on both paths, so a window
			// ending mid-fight resumes the same battle.
			squad.fightSeed = deriveFightSeed(
				def.id,
				squad.composition,
				dungeon.clearCount,
			);
			// A fighting squad carries no deadline: no state can say "decided but
			// not yet applied".
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

	// ── Pass 2: redeploy ──
	// Separate from pass 1 because only one squad may hold a dungeon, so an
	// arrival has to see the claims of squads that landed alongside it. Claiming
	// as we go in `draft.squads` order settles the tie identically every time:
	// earlier in the list, which is creation order, wins.
	const occupied = dungeonOccupancy(draft.squads);
	for (const squad of arrivedHome) {
		const dungeon = draft.dungeons.find((d) => d.id === squad.targetDungeonId);
		// Read before being cleared: the flag describes the trip that just ended.
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

	// After the redeploy: unlocks are one-way and turn only on clear counts, and
	// auto-deploy only re-reads the arriving squad's own target, already unlocked.
	draft.dungeons = checkUnlockConditions(draft.dungeons);

	draft.meta.tickCount = toTick;
	draft.meta.dayCount = Math.floor(toTick / TICKS_PER_DAY);
}
