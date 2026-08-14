import type { PoolId, Rarity, Resources } from "../types";

export interface PoolConfig {
	/**
	 * Relative weights, normalised at roll time; nothing requires them to sum to
	 * 100. Read displayed odds through `poolOdds()`.
	 */
	odds: { rarity: Rarity; weight: number }[];
	pityRarity: Rarity | null;
	pityInterval: number;
	x10Guarantee: Rarity | null;
	cost1: { resource: keyof Resources; amount: number };
	cost10: { resource: keyof Resources; amount: number };
}

export const FREE_PULL_INTERVAL_TICKS = 3000;
export const FREE_PULL_CAP = 10;

export const POOL_CONFIGS: Record<PoolId, PoolConfig> = {
	banner: {
		odds: [
			{ rarity: "common", weight: 70 },
			{ rarity: "uncommon", weight: 25 },
			{ rarity: "rare", weight: 5 },
		],
		pityRarity: null,
		pityInterval: 0,
		x10Guarantee: "uncommon",
		cost1: { resource: "banners", amount: 10 },
		cost10: { resource: "banners", amount: 90 },
	},
	carrion: {
		odds: [
			{ rarity: "common", weight: 30 },
			{ rarity: "uncommon", weight: 40 },
			{ rarity: "rare", weight: 25 },
			{ rarity: "epic", weight: 5 },
		],
		pityRarity: "epic",
		pityInterval: 40,
		x10Guarantee: "rare",
		cost1: { resource: "corpses", amount: 1000 },
		cost10: { resource: "corpses", amount: 9000 },
	},
	forbidden: {
		odds: [
			{ rarity: "rare", weight: 75 },
			{ rarity: "epic", weight: 20 },
			{ rarity: "legendary", weight: 5 },
		],
		pityRarity: "legendary",
		pityInterval: 50,
		x10Guarantee: "epic",
		cost1: { resource: "souls", amount: 5 },
		cost10: { resource: "souls", amount: 45 },
	},
};
