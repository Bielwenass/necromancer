import { applyCost, canAffordCost } from "../resources";
import { isUnitUnlocked, summonCost } from "../summoning";
import type { GardenPlotId, UnitType } from "../types";
import { canPurchaseUpgrade, UPGRADE_NODES, upgradeCost } from "../upgrades";
import {
	type CryptKey,
	cryptCost,
	gardenCost,
	type StatKey,
	type UnitKey,
	unitStatCost,
} from "../workshopUpgrades";
import { applyUnitDelta, withDerived } from "./helpers";
import type { SliceCreator } from "./types";

export interface ProgressionSlice {
	purchaseUpgrade: (nodeId: string) => void;
	levelUpWorkshop: (key: string) => void;
	summonUnits: (type: UnitType, count: number) => void;
	digBone: () => void;
}

export const createProgressionSlice: SliceCreator<ProgressionSlice> = (
	set,
) => ({
	purchaseUpgrade: (nodeId) => {
		set((prev) => {
			if (!canPurchaseUpgrade(prev, nodeId)) return prev;
			const node = UPGRADE_NODES.find((n) => n.id === nodeId);
			if (!node) return prev;

			return withDerived(prev, {
				resources: applyCost(upgradeCost(node), prev.resources),
				upgrades: { purchased: [...prev.upgrades.purchased, nodeId] },
			});
		});
	},

	/** `key` is `"garden.<resource>"`, `"crypt.<stat>"`, or `"<unit>.<stat>"`. */
	levelUpWorkshop: (key) => {
		set((prev) => {
			const ws = prev.workshop;
			let cost: ReturnType<typeof unitStatCost>;
			let workshop = ws;

			if (key.startsWith("garden.")) {
				const plot = key.split(".")[1] as GardenPlotId;
				if (!(plot in ws.garden)) return prev;
				const level = ws.garden[plot];
				cost = gardenCost(plot, level);
				workshop = { ...ws, garden: { ...ws.garden, [plot]: level + 1 } };
			} else if (key.startsWith("crypt.")) {
				const stat = key.split(".")[1] as CryptKey;
				const level = ws.crypt[stat];
				cost = cryptCost(stat, level);
				workshop = { ...ws, crypt: { ...ws.crypt, [stat]: level + 1 } };
			} else {
				const [unit, stat] = key.split(".") as [UnitKey, StatKey];
				const level = ws[unit][stat];
				cost = unitStatCost(unit, stat, level);
				workshop = { ...ws, [unit]: { ...ws[unit], [stat]: level + 1 } };
			}

			if (!canAffordCost(cost, prev.resources)) return prev;

			return withDerived(prev, {
				resources: applyCost(cost, prev.resources),
				workshop,
			});
		});
	},

	summonUnits: (type, count) => {
		set((prev) => {
			if (!isUnitUnlocked(type, prev.derived)) return prev;
			const cost = summonCost(type, count, prev.derived);
			if (!canAffordCost(cost, prev.resources)) return prev;

			return {
				resources: applyCost(cost, prev.resources),
				units: applyUnitDelta(prev.units, { [type]: count }, 1),
			};
		});
	},

	digBone: () => {
		set((prev) => ({
			resources: { ...prev.resources, bones: prev.resources.bones + 1 },
		}));
	},
});
