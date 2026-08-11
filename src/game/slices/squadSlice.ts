import { DUNGEON_DEFS } from "../data/dungeons";
import { generateLoot } from "../tick";
import type { UnitType } from "../types";
import {
	applyUnitDelta,
	hasUnitsAvailable,
	totalUnits,
	withDerived,
} from "./helpers";
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
			if (totalUnits(squad.composition) === 0) return prev;

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

	recallSquad: (squadId) => {
		set((prev) => ({
			squads: prev.squads.map((s) => {
				if (s.id !== squadId) return s;
				if (s.state === "idle" || s.state === "returning") return s;
				return {
					...s,
					state: "returning" as const,
					pendingLoot: null,
					manualRecall: true,
				};
			}),
		}));
	},

	createSquad: (composition, name) => {
		const state = get();
		const size = totalUnits(composition);
		if (size === 0 || size > state.derived.maxSquadSize) return null;
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

			// A wipe destroys the squad outright — its units are simply gone.
			if (winner !== "a") {
				return { squads: prev.squads.filter((s) => s.id !== squadId) };
			}

			const composition = {
				skeleton: survivorsByType.skeleton ?? 0,
				zombie: survivorsByType.zombie ?? 0,
				wraith: survivorsByType.wraith ?? 0,
			};
			const pendingLoot = generateLoot(
				dungeonId,
				dungeonState.clearCount,
				prev.derived.soulHarvestBonus,
			);

			return withDerived(prev, {
				resources: {
					...prev.resources,
					banners: prev.resources.banners + def.tier,
				},
				squads: prev.squads.map((s) =>
					s.id === squadId
						? {
								...s,
								state: "returning" as const,
								position: 1.0,
								composition,
								pendingLoot,
							}
						: s,
				),
				dungeons: prev.dungeons.map((ds) =>
					ds.id === dungeonId ? { ...ds, clearCount: ds.clearCount + 1 } : ds,
				),
			});
		});
	},
});
