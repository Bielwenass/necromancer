import {
	FREE_PULL_CAP,
	FREE_PULL_INTERVAL_TICKS,
	POOL_CONFIGS,
	type PoolConfig,
} from "../data/gacha";
import { RELIC_BASES } from "../data/relics";
import type { GameState, PoolId, Rarity, Relic } from "../types";
import { rarityRank, rollRelic } from "./relics";

export { POOL_CONFIGS };

/**
 * A pool's drop table as displayed percentages. The weights are relative, so
 * they are normalised here rather than printed raw — they happen to sum to 100
 * in every pool today, and reading them as percentages directly would break
 * silently the first time one didn't.
 */
export function poolOdds(poolId: PoolId): { rarity: Rarity; pct: number }[] {
	const { odds } = POOL_CONFIGS[poolId];
	const total = odds.reduce((s, o) => s + o.weight, 0);
	return odds.map((o) => ({ rarity: o.rarity, pct: (o.weight / total) * 100 }));
}

function rollRarity(config: PoolConfig): Rarity {
	const total = config.odds.reduce((s, o) => s + o.weight, 0);
	let r = Math.random() * total;
	for (const o of config.odds) {
		r -= o.weight;
		if (r <= 0) return o.rarity;
	}
	return config.odds[config.odds.length - 1].rarity;
}

/** Up to two rolls for `rarity` or better, falling back to `rarity` itself. */
function guaranteeAtLeast(rarity: Rarity, config: PoolConfig): Rarity {
	const rolled = rollRarity(config);
	if (rarityRank(rolled) >= rarityRank(rarity)) return rolled;
	const rerolled = rollRarity(config);
	if (rarityRank(rerolled) >= rarityRank(rarity)) return rerolled;
	return rarity;
}

/** Every base is eligible at every rarity, hence the unused parameter. */
function pickBase(_rarity: Rarity): string {
	const bases = RELIC_BASES;
	return bases[Math.floor(Math.random() * bases.length)].id;
}

/**
 * Pulls between guarantees, after the Dark Pact discount. Never below one, so a
 * stacked discount can't turn the counter into a guarantee on every pull.
 */
export function effectivePityInterval(
	poolId: PoolId,
	pityReduction: number,
): number {
	const { pityInterval } = POOL_CONFIGS[poolId];
	if (pityInterval <= 0) return pityInterval;
	return Math.max(1, Math.round(pityInterval * (1 - pityReduction)));
}

/**
 * Advance the Phylactery by `ticks` and hand back the new counters.
 *
 * Written to be batch-exact: one call for a thousand ticks lands on the same
 * numbers as a thousand calls for one, which is what lets the live tick and the
 * offline catchup share it. At the cap, progress stops rather than banking a
 * backlog, so a week away is worth the same as a night.
 */
export function accrueFreePulls(
	gacha: Pick<GameState["gacha"], "freePulls" | "freePullTicks">,
	phylactery: boolean,
	ticks: number,
): { freePulls: number; freePullTicks: number } {
	const current = {
		freePulls: gacha.freePulls,
		freePullTicks: gacha.freePullTicks,
	};
	if (!phylactery || ticks <= 0) return current;
	if (gacha.freePulls >= FREE_PULL_CAP) {
		return { freePulls: FREE_PULL_CAP, freePullTicks: 0 };
	}

	const progress = gacha.freePullTicks + ticks;
	const freePulls = Math.min(
		FREE_PULL_CAP,
		gacha.freePulls + Math.floor(progress / FREE_PULL_INTERVAL_TICKS),
	);
	return {
		freePulls,
		freePullTicks:
			freePulls >= FREE_PULL_CAP ? 0 : progress % FREE_PULL_INTERVAL_TICKS,
	};
}

export function executePull(
	state: GameState,
	poolId: PoolId,
	count: 1 | 10,
): { relics: Relic[]; pityCounter: number } {
	const config = POOL_CONFIGS[poolId];
	const pityInterval = effectivePityInterval(
		poolId,
		state.derived.pityReduction,
	);
	let pity = state.gacha.pityCounters[poolId];
	const relics: Relic[] = [];

	for (let i = 0; i < count; i++) {
		let rarity: Rarity;

		// A natural roll at or above the pity rarity resets the counter too, so
		// the guarantee never fires right after the player already got one.
		if (config.pityRarity && pityInterval > 0) {
			pity++;
			if (pity >= pityInterval) {
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

	// A ×10 that rolled nothing at the guaranteed rarity has its last relic
	// replaced, rather than an extra one appended.
	const x10Guarantee = config.x10Guarantee;
	if (count === 10 && x10Guarantee) {
		const hasGuarantee = relics.some(
			(r) => rarityRank(r.rarity) >= rarityRank(x10Guarantee),
		);
		if (!hasGuarantee) {
			const guaranteedRarity = guaranteeAtLeast(x10Guarantee, config);
			const baseId = pickBase(guaranteedRarity);
			relics[relics.length - 1] = rollRelic(baseId, guaranteedRarity);
		}
	}

	return { relics, pityCounter: pity };
}
