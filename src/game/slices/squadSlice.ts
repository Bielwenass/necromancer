import { DUNGEON_DEFS } from "../data/dungeons";
import { resolveFightOutcome } from "../rules/fight";
import { addComposition, replenishDelta, squadSize } from "../rules/units";
import type { UnitType } from "../types";
import { applyUnitDelta, hasUnitsAvailable, withDerived } from "./helpers";
import type { SliceCreator } from "./types";

let squadIdCounter = 0;

/**
 * Keep new squad ids from colliding with ones already on disk. Called once
 * during hydration, before any squad is created.
 */
export function syncSquadIdCounter(squads: Array<{ id: string }>): void {
	for (const squad of squads) {
		const match = /^S-(\d+)$/.exec(squad.id);
		if (match) {
			squadIdCounter = Math.max(squadIdCounter, parseInt(match[1], 10));
		}
	}
}

function nextSquadId(): string {
	return `S-${String(++squadIdCounter).padStart(2, "0")}`;
}

export interface SquadSlice {
	dispatchSquad: (squadId: string, dungeonId: string) => void;
	recallSquad: (squadId: string) => void;
	replenishSquad: (squadId: string) => void;
	createSquad: (
		composition: Record<UnitType, number>,
		name: string,
	) => string | null;
	deleteSquad: (squadId: string) => void;
	resolveFight: (
		squadId: string,
		winner: "a" | "b" | "draw",
		survivorsByType: Record<string, number>,
	) => void;
}

export const createSquadSlice: SliceCreator<SquadSlice> = (set, get) => ({
	dispatchSquad: (squadId, dungeonId) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			const dungeonState = prev.dungeons.find((d) => d.id === dungeonId);
			if (!squad || !dungeonState) return prev;
			if (!dungeonState.unlocked) return prev;
			if (squad.state !== "idle") return prev;
			if (squadSize(squad.composition) === 0) return prev;

			return {
				squads: prev.squads.map((s) =>
					s.id === squadId
						? {
								...s,
								state: "traveling" as const,
								targetDungeonId: dungeonId,
								position: 0,
							}
						: s,
				),
			};
		});
	},

	/**
	 * Turn a squad around, or — for one already on its way home — mark the trip
	 * as a recall so auto-deploy leaves it in the crypt on arrival. The loot a
	 * returning squad carries survives that; only a squad pulled out mid-run
	 * drops it, since it never finished the dungeon.
	 */
	recallSquad: (squadId) => {
		set((prev) => ({
			squads: prev.squads.map((s) => {
				if (s.id !== squadId) return s;
				if (s.state === "idle") return s;
				if (s.state === "returning") return { ...s, manualRecall: true };
				return {
					...s,
					state: "returning" as const,
					pendingLoot: null,
					manualRecall: true,
				};
			}),
		}));
	},

	/**
	 * Refill an idle squad from the reserves back up to the strength it was
	 * raised at. Partial when the reserves are short — what is there is drafted.
	 */
	replenishSquad: (squadId) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			// Units in the field are held by the squad, so drafting into one would
			// mean two claims on the same skeleton.
			if (squad?.state !== "idle") return prev;

			const delta = replenishDelta(
				squad,
				prev.units,
				prev.derived.maxSquadSize,
			);
			if (squadSize(delta) === 0) return prev;

			return {
				units: applyUnitDelta(prev.units, delta, -1),
				squads: prev.squads.map((s) =>
					s.id === squadId
						? {
								...s,
								composition: addComposition(s.composition, delta),
							}
						: s,
				),
			};
		});
	},

	createSquad: (composition, name) => {
		const state = get();
		const size = squadSize(composition);
		if (size === 0 || size > state.derived.maxSquadSize) return null;
		if (state.squads.length >= state.derived.maxSquads) return null;
		if (!hasUnitsAvailable(state.units, composition)) return null;

		const squadId = nextSquadId();

		set((prev) => ({
			units: applyUnitDelta(prev.units, composition, -1),
			squads: [
				...prev.squads,
				{
					id: squadId,
					name,
					composition: { ...composition },
					roster: { ...composition },
					targetDungeonId: null,
					state: "idle" as const,
					position: 0,
					pendingLoot: null,
				},
			],
		}));

		return squadId;
	},

	deleteSquad: (squadId) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			// Only an idle squad can be disbanded — a squad in the field still
			// "holds" its units, so refunding them mid-run would duplicate them.
			if (squad?.state !== "idle") return prev;
			return {
				units: applyUnitDelta(prev.units, squad.composition, 1),
				squads: prev.squads.filter((s) => s.id !== squadId),
			};
		});
	},

	resolveFight: (squadId, winner, survivorsByType) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			if (squad?.state !== "fighting") return prev;

			const dungeonId = squad.targetDungeonId;
			if (!dungeonId) return prev;
			const dungeonState = prev.dungeons.find((d) => d.id === dungeonId);
			const def = DUNGEON_DEFS[dungeonId];
			if (!dungeonState || !def) return prev;

			// The rules themselves live in `rules/fight.ts`, which offline catchup
			// calls too — this action only applies the result to store state.
			const res = resolveFightOutcome(
				squad.composition,
				def,
				dungeonState.clearCount,
				{ winner, survivorsByType },
				prev.derived,
			);

			if (res.kind === "destroyed") {
				return { squads: prev.squads.filter((s) => s.id !== squadId) };
			}

			return withDerived(prev, {
				resources: {
					...prev.resources,
					banners: prev.resources.banners + res.bannersAwarded,
				},
				squads: prev.squads.map((s) =>
					s.id === squadId
						? {
								...s,
								state: "returning" as const,
								position: 1.0,
								composition: res.composition,
								pendingLoot: res.loot,
								manualRecall: res.suppressAutoDeploy,
							}
						: s,
				),
				dungeons: prev.dungeons.map((ds) =>
					ds.id === dungeonId
						? { ...ds, clearCount: ds.clearCount + res.clearCountDelta }
						: ds,
				),
			});
		});
	},
});
