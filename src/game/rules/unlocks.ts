import { DUNGEON_DEFS } from "../data/dungeons";
import type { DungeonDef, DungeonState, UnlockRule } from "../types";

export { DUNGEON_DEFS };

export function makeDungeonState(
	def: DungeonDef,
	unlocked: boolean,
): DungeonState {
	return {
		id: def.id,
		clearCount: 0,
		unlocked,
	};
}

/**
 * Whether a rule is satisfied, given a lookup of clear counts. The rules
 * themselves live on each `DungeonDef` in `data/dungeons.ts`.
 */
export function isUnlockSatisfied(
	rule: UnlockRule,
	clears: (dungeonId: string) => number,
): boolean {
	switch (rule.kind) {
		case "always":
			return true;

		case "clears":
			return rule.requires.every((r) => clears(r.dungeonId) >= r.count);

		case "allOfTier":
			return Object.values(DUNGEON_DEFS)
				.filter(
					(d) => d.tier === rule.tier && !(rule.except ?? []).includes(d.id),
				)
				.every((d) => clears(d.id) >= rule.count);
	}
}

export function checkUnlockConditions(
	dungeons: DungeonState[],
): DungeonState[] {
	const clears = (id: string) =>
		dungeons.find((d) => d.id === id)?.clearCount ?? 0;

	return dungeons.map((ds) => {
		if (ds.unlocked) return ds;
		const def = DUNGEON_DEFS[ds.id];
		if (!def) return ds;
		return isUnlockSatisfied(def.unlock, clears)
			? { ...ds, unlocked: true }
			: ds;
	});
}
