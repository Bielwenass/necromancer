import type { StateCreator } from "zustand";
import type { GameState } from "../types";
import type { CombatSlice } from "./combatSlice";
import type { PersistenceSlice } from "./persistenceSlice";
import type { ProgressionSlice } from "./progressionSlice";
import type { RelicSlice } from "./relicSlice";
import type { SquadSlice } from "./squadSlice";

/** The full store: game state plus every slice's actions and runtime. */
export type StoreState = GameState &
	CombatSlice &
	SquadSlice &
	RelicSlice &
	ProgressionSlice &
	PersistenceSlice;

/**
 * Each slice is a `StateCreator` over the *whole* store, so a slice may read
 * state owned by another slice via `get()` while only declaring the actions it
 * contributes.
 */
export type SliceCreator<T> = StateCreator<StoreState, [], [], T>;
