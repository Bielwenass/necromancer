import { RELIC_BASES } from "./data/relics";
import { rollRelic } from "./relics";
import type { GameState, PoolId, Rarity, Relic, Resources } from "./types";

interface PoolConfig {
	odds: { rarity: Rarity; weight: number }[];
	pityRarity: Rarity | null;
	pityInterval: number;
	x10Guarantee: Rarity | null;
	cost1: { resource: keyof Resources; amount: number };
	cost10: { resource: keyof Resources; amount: number };
}

/**
 * Pool ids are historical — `bone` and `soul` no longer name the currency they
 * charge (banners and corpses respectively). They stay as they are because
 * `gacha.pityCounters` is keyed by them and is persisted.
 */
export const POOL_CONFIGS: Record<PoolId, PoolConfig> = {
	bone: {
		odds: [
			{ rarity: "common", weight: 70 },
			{ rarity: "uncommon", weight: 25 },
			{ rarity: "rare", weight: 5 },
		],
		pityRarity: null,
		pityInterval: 0,
		x10Guarantee: "uncommon",
		cost1: { resource: "banners", amount: 2 },
		cost10: { resource: "banners", amount: 18 },
	},
	soul: {
		odds: [
			{ rarity: "common", weight: 30 },
			{ rarity: "uncommon", weight: 40 },
			{ rarity: "rare", weight: 25 },
			{ rarity: "epic", weight: 5 },
		],
		pityRarity: "rare",
		pityInterval: 20,
		x10Guarantee: "rare",
		cost1: { resource: "corpses", amount: 40 },
		cost10: { resource: "corpses", amount: 360 },
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

function rollRarity(config: PoolConfig): Rarity {
	const total = config.odds.reduce((s, o) => s + o.weight, 0);
	let r = Math.random() * total;
	for (const o of config.odds) {
		r -= o.weight;
		if (r <= 0) return o.rarity;
	}
	return config.odds[config.odds.length - 1].rarity;
}

function rarityRank(r: Rarity): number {
	return { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }[r];
}

function guaranteeAtLeast(rarity: Rarity, config: PoolConfig): Rarity {
	const rolled = rollRarity(config);
	if (rarityRank(rolled) >= rarityRank(rarity)) return rolled;
	// try to reroll once more
	const rerolled = rollRarity(config);
	if (rarityRank(rerolled) >= rarityRank(rarity)) return rerolled;
	return rarity;
}

function pickBase(_rarity: Rarity): string {
	// All bases are eligible for all rarities
	const bases = RELIC_BASES;
	return bases[Math.floor(Math.random() * bases.length)].id;
}

export function executePull(
	state: GameState,
	poolId: PoolId,
	count: 1 | 10,
): { relics: Relic[]; pityCounter: number } {
	const config = POOL_CONFIGS[poolId];
	let pity = state.gacha.pityCounters[poolId];
	const relics: Relic[] = [];

	for (let i = 0; i < count; i++) {
		let rarity: Rarity;

		// Pity check
		if (config.pityRarity && config.pityInterval > 0) {
			pity++;
			if (pity >= config.pityInterval) {
				rarity = config.pityRarity;
				pity = 0;
			} else {
				rarity = rollRarity(config);
				if (rarityRank(rarity) >= rarityRank(config.pityRarity)) {
					pity = 0;
				}
			}
		} else {
			rarity = rollRarity(config);
		}

		const baseId = pickBase(rarity);
		relics.push(rollRelic(baseId, rarity));
	}

	// x10 guarantee
	const x10Guarantee = config.x10Guarantee;
	if (count === 10 && x10Guarantee) {
		const hasGuarantee = relics.some(
			(r) => rarityRank(r.rarity) >= rarityRank(x10Guarantee),
		);
		if (!hasGuarantee) {
			// Replace last relic with guaranteed rarity
			const guaranteedRarity = guaranteeAtLeast(x10Guarantee, config);
			const baseId = pickBase(guaranteedRarity);
			relics[relics.length - 1] = rollRelic(baseId, guaranteedRarity);
		}
	}

	return { relics, pityCounter: pity };
}
