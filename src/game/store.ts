import { create } from "zustand";
import { buildHydratedState } from "./initialState";
import { createCombatSlice } from "./slices/combatSlice";
import { createPersistenceSlice } from "./slices/persistenceSlice";
import { createProgressionSlice } from "./slices/progressionSlice";
import { createRelicSlice } from "./slices/relicSlice";
import { createSquadSlice } from "./slices/squadSlice";
import type { StoreState } from "./slices/types";

export type { StoreState } from "./slices/types";

/**
 * One store composed from four action slices plus persistence. Slices are split
 * by domain only — they share a single state object, so any slice may read the
 * whole store through `get()`.
 */
export const useGameStore = create<StoreState>()((...args) => ({
	...buildHydratedState(),
	...createCombatSlice(...args),
	...createSquadSlice(...args),
	...createRelicSlice(...args),
	...createProgressionSlice(...args),
	...createPersistenceSlice(...args),
}));
