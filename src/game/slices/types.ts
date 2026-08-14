import type { StateCreator } from "zustand";
import type { GameState } from "../types";
import type { CombatSlice } from "./combatSlice";
import type { PersistenceSlice } from "./persistenceSlice";
import type { ProgressionSlice } from "./progressionSlice";
import type { RelicSlice } from "./relicSlice";
import type { SquadSlice } from "./squadSlice";

export type StoreState = GameState &
	CombatSlice &
	SquadSlice &
	RelicSlice &
	ProgressionSlice &
	PersistenceSlice;

/**
 * Each slice is a `StateCreator` over the whole store, so it may read another
 * slice's state via `get()` while declaring only the actions it contributes.
 */
export type SliceCreator<T> = StateCreator<StoreState, [], [], T>;
