import { DUNGEON_DEFS } from "../data/dungeons";
import type { DungeonDef, DungeonState } from "../types";

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

export function checkUnlockConditions(
	dungeons: DungeonState[],
): DungeonState[] {
	const clears = (id: string) =>
		dungeons.find((d) => d.id === id)?.clearCount ?? 0;

	return dungeons.map((ds) => {
		if (ds.unlocked) return ds;

		const def = DUNGEON_DEFS[ds.id];
		if (!def) return ds;

		if (def.unlockCondition.every((r) => clears(r.dungeonId) >= r.count)) {
			return { ...ds, unlocked: true };
		}

		return ds;
	});
}
