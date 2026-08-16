import { applyFightResolution, cloneForAdvance } from "../advance";
import { DUNGEON_DEFS } from "../data/dungeons";
import { dungeonOccupancy } from "../rules/squads";
import { travelLegTicks } from "../rules/travel";
import { addComposition, replenishDelta, squadSize } from "../rules/units";
import type { SquadComposition, UnitType } from "../types";
import { applyUnitDelta, hasUnitsAvailable, withDerived } from "./helpers";
import type { SliceCreator } from "./types";

let squadIdCounter = 0;

/** Keeps new squad ids off saved ones. Called once during hydration. */
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
		survivorsByType: SquadComposition,
	) => void;
}

export const createSquadSlice: SliceCreator<SquadSlice> = (set, get) => ({
	dispatchSquad: (squadId, dungeonId) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			const dungeonState = prev.dungeons.find((d) => d.id === dungeonId);
			const def = DUNGEON_DEFS[dungeonId];
			if (!squad || !dungeonState || !def) return prev;
			if (!dungeonState.unlocked) return prev;
			if (squad.state !== "idle") return prev;
			if (squadSize(squad.composition) === 0) return prev;
			// One squad per dungeon; the dispatcher is idle, so it never blocks itself.
			if (dungeonOccupancy(prev.squads).has(dungeonId)) return prev;

			const legTicks = travelLegTicks(def, prev.derived.squadTravelSpeedBonus);
			return {
				squads: prev.squads.map((s) =>
					s.id === squadId
						? {
								...s,
								state: "traveling" as const,
								targetDungeonId: dungeonId,
								phaseStartTick: prev.meta.tickCount,
								phaseEndTick: prev.meta.tickCount + legTicks,
							}
						: s,
				),
			};
		});
	},

	/**
	 * Turn a squad around, or mark an already-returning trip as a recall so
	 * auto-deploy leaves it in the crypt. A returning squad keeps its loot; one
	 * pulled out mid-run drops it.
	 */
	recallSquad: (squadId) => {
		// A squad pulled out of a fight abandons it, so its engine is retired before
		// reaching a verdict `resolveFight` would discard.
		if (get().squads.find((s) => s.id === squadId)?.state === "fighting") {
			get().removeCombatEngine(squadId);
		}
		set((prev) => {
			const tickCount = prev.meta.tickCount;
			return {
				squads: prev.squads.map((s) => {
					if (s.id !== squadId) return s;
					if (s.state === "idle") return s;
					if (s.state === "returning") return { ...s, manualRecall: true };

					const def = s.targetDungeonId
						? DUNGEON_DEFS[s.targetDungeonId]
						: undefined;
					const fullLeg = def
						? travelLegTicks(def, prev.derived.squadTravelSpeedBonus)
						: 1;
					// Turning back costs whatever was walked; one pulled out of a fight
					// walks the whole way home.
					const walked =
						s.state === "fighting"
							? fullLeg
							: Math.min(
									fullLeg,
									Math.max(1, tickCount - (s.phaseStartTick ?? tickCount)),
								);

					return {
						...s,
						state: "returning" as const,
						pendingLoot: null,
						manualRecall: true,
						phaseStartTick: tickCount,
						phaseEndTick: tickCount + walked,
					};
				}),
			};
		});
	},

	replenishSquad: (squadId) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			// A squad in the field holds its units; drafting into one double-claims.
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
					pendingLoot: null,
				},
			],
		}));

		return squadId;
	},

	deleteSquad: (squadId) => {
		set((prev) => {
			const squad = prev.squads.find((s) => s.id === squadId);
			// A squad in the field still holds its units; refunding duplicates them.
			if (squad?.state !== "idle") return prev;
			return {
				units: applyUnitDelta(prev.units, squad.composition, 1),
				squads: prev.squads.filter((s) => s.id !== squadId),
			};
		});
	},

	resolveFight: (squadId, winner, survivorsByType) => {
		set((prev) => {
			const current = prev.squads.find((s) => s.id === squadId);
			if (current?.state !== "fighting") return prev;
			const dungeonId = current.targetDungeonId;
			if (!dungeonId || !DUNGEON_DEFS[dungeonId]) return prev;

			// `applyFightResolution` is shared with catchup; this decides the timing.
			const draft = cloneForAdvance(prev);
			const squad = draft.squads.find((s) => s.id === squadId);
			const dungeon = draft.dungeons.find((d) => d.id === dungeonId);
			if (!squad || !dungeon) return prev;

			applyFightResolution(
				draft,
				squad,
				dungeon,
				{ winner, survivorsByType },
				prev.meta.tickCount,
			);

			return withDerived(prev, {
				squads: draft.squads,
				dungeons: draft.dungeons,
			});
		});
	},
});
