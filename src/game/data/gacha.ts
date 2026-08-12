import type { PoolId, Rarity, Resources } from "../types";

export interface PoolConfig {
	/**
	 * Relative weights, normalised at roll time. They happen to sum to 100 in
	 * every pool today, but nothing requires that — read the displayed odds
	 * through `poolOdds()` rather than treating a weight as a percentage.
	 */
	odds: { rarity: Rarity; weight: number }[];
	/** Rarity forced when the counter hits `pityInterval`; null disables pity. */
	pityRarity: Rarity | null;
	pityInterval: number;
	/** Floor guaranteed somewhere in a ×10 pull. */
	x10Guarantee: Rarity | null;
	cost1: { resource: keyof Resources; amount: number };
	cost10: { resource: keyof Resources; amount: number };
}

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
