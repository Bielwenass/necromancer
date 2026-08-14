import { advance, cloneForAdvance, LIVE_FIGHTS } from "./advance";
import type { GameState } from "./types";

/**
 * One tick of the live game. The simulation itself is `advance`; this paces it
 * at one tick per call and hands the store a fresh object graph to swap in.
 *
 * Free of `Date.now()` and `Math.random()` — everything here has to reproduce,
 * or a mid-window refresh would not land where the player left.
 */
export function gameTick(state: GameState): Partial<GameState> {
	const draft = cloneForAdvance(state);
	advance(draft, state.meta.tickCount + 1, LIVE_FIGHTS);
	return draft;
}
