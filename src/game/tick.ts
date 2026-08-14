import { advance, cloneForAdvance, LIVE_FIGHTS } from "./advance";
import type { GameState } from "./types";

/**
 * One tick of the live game. The simulation is `advance`; this paces it at one
 * tick per call and hands the store a fresh object graph. Free of `Date.now()`
 * and `Math.random()`, so a mid-window refresh lands where the player left.
 */
export function gameTick(state: GameState): GameState {
	const draft = cloneForAdvance(state);
	advance(draft, state.meta.tickCount + 1, LIVE_FIGHTS);
	return draft;
}
