import type { Resources } from "./types";

/**
 * Generic resource-cost helpers. A cost is a `Partial<Resources>` — absent keys
 * mean "free", never "zero required", so callers can list only what they charge.
 */

export function canAffordCost(
	cost: Partial<Resources>,
	res: Resources,
): boolean {
	return (
		(cost.bones ?? 0) <= res.bones &&
		(cost.coins ?? 0) <= res.coins &&
		(cost.souls ?? 0) <= res.souls &&
		(cost.dust ?? 0) <= res.dust &&
		(cost.corpses ?? 0) <= res.corpses &&
		(cost.banners ?? 0) <= res.banners
	);
}

export function applyCost(cost: Partial<Resources>, res: Resources): Resources {
	return {
		...res,
		bones: res.bones - (cost.bones ?? 0),
		coins: res.coins - (cost.coins ?? 0),
		souls: res.souls - (cost.souls ?? 0),
		dust: res.dust - (cost.dust ?? 0),
		corpses: res.corpses - (cost.corpses ?? 0),
		banners: res.banners - (cost.banners ?? 0),
	};
}
