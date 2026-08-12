import { executePull, POOL_CONFIGS } from "../rules/gacha";
import { canEquipInSlot, DUST_VALUES } from "../rules/relics";
import type { PoolId, SlotId } from "../types";
import { withDerived, withoutRelic } from "./helpers";
import type { SliceCreator } from "./types";

export interface RelicSlice {
	equipRelic: (relicId: string, slotId: SlotId) => void;
	unequipRelic: (slotId: SlotId) => void;
	markRelicSeen: (relicId: string) => void;
	sacrificeRelic: (relicId: string) => void;
	sacrificeRelics: (relicIds: string[]) => void;
	pull: (poolId: PoolId, count: 1 | 10) => void;
	clearLastPulled: () => void;
}

export const createRelicSlice: SliceCreator<RelicSlice> = (set, get) => ({
	equipRelic: (relicId, slotId) => {
		set((prev) => {
			const relic = prev.relics.inventory.find((r) => r.id === relicId);
			if (!relic) return prev;
			if (!canEquipInSlot(relic.baseId, slotId)) return prev;

			// Clear the relic's previous slot first, so moving it between slots
			// can't leave it equipped twice. Whatever occupied `slotId` is simply
			// displaced and stays in the inventory.
			const equipped = withoutRelic(prev.relics.equipped, relicId);
			equipped[slotId] = relicId;

			return withDerived(prev, { relics: { ...prev.relics, equipped } });
		});
	},

	unequipRelic: (slotId) => {
		set((prev) => {
			const equipped = { ...prev.relics.equipped };
			delete equipped[slotId];
			return withDerived(prev, { relics: { ...prev.relics, equipped } });
		});
	},

	markRelicSeen: (relicId) => {
		set((prev) => ({
			relics: {
				...prev.relics,
				inventory: prev.relics.inventory.map((r) =>
					r.id === relicId ? { ...r, isNew: false } : r,
				),
			},
		}));
	},

	sacrificeRelic: (relicId) => {
		get().sacrificeRelics([relicId]);
	},

	sacrificeRelics: (relicIds) => {
		set((prev) => {
			const doomed = new Set(relicIds);
			const sacrificed = prev.relics.inventory.filter((r) => doomed.has(r.id));
			if (sacrificed.length === 0) return prev;

			const dust = sacrificed.reduce(
				(sum, r) => sum + DUST_VALUES[r.rarity],
				0,
			);
			let equipped = prev.relics.equipped;
			for (const r of sacrificed) equipped = withoutRelic(equipped, r.id);

			return withDerived(prev, {
				resources: { ...prev.resources, dust: prev.resources.dust + dust },
				relics: {
					inventory: prev.relics.inventory.filter((r) => !doomed.has(r.id)),
					equipped,
				},
			});
		});
	},

	pull: (poolId, count) => {
		set((prev) => {
			const config = POOL_CONFIGS[poolId];
			const { resource, amount } = count === 1 ? config.cost1 : config.cost10;
			if (prev.resources[resource] < amount) return prev;

			const { relics: pulled, pityCounter } = executePull(prev, poolId, count);

			return {
				resources: {
					...prev.resources,
					[resource]: prev.resources[resource] - amount,
				},
				relics: {
					...prev.relics,
					inventory: [
						...prev.relics.inventory,
						...pulled.map((r) => ({ ...r, isNew: true })),
					],
				},
				gacha: {
					...prev.gacha,
					pityCounters: { ...prev.gacha.pityCounters, [poolId]: pityCounter },
					lastPulledRelics: pulled,
				},
			};
		});
	},

	clearLastPulled: () => {
		set((prev) => ({ gacha: { ...prev.gacha, lastPulledRelics: null } }));
	},
});
