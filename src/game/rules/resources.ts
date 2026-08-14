import type { Resources } from "../types";

/**
 * Generic resource-cost helpers. A cost is a `Partial<Resources>` — absent keys
 * mean free.
 */

/** Every resource in display order. */
export const RESOURCE_KEYS = [
	"bones",
	"souls",
	"dust",
	"corpses",
	"banners",
] as const satisfies readonly (keyof Resources)[];

/** A full ledger at zero, for a delta or an empty purse. */
export function zeroResources(): Resources {
	return { bones: 0, souls: 0, dust: 0, corpses: 0, banners: 0 };
}

export function canAffordCost(
	cost: Partial<Resources>,
	res: Resources,
): boolean {
	return RESOURCE_KEYS.every((key) => (cost[key] ?? 0) <= res[key]);
}

export function applyCost(cost: Partial<Resources>, res: Resources): Resources {
	const next = { ...res };
	for (const key of RESOURCE_KEYS) next[key] -= cost[key] ?? 0;
	return next;
}
