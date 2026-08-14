import { useEffect, useRef, useState } from "react";
import type { CombatEngine } from "../combat/engine";
import { type CatchupStats, simulateOffline } from "./catchupOffline";
import { CATCHUP_THRESHOLD_MS, TICK_MS } from "./data/pacing";
import { beginLiveFights, stepLiveFights } from "./liveFights";
import { recomputeDerived } from "./rules/derived";
import { zeroResources } from "./rules/resources";
import { PERSISTED_KEYS, saveGame } from "./save";
import { useGameStore } from "./store";
import type { GameState } from "./types";

export interface CatchupState {
	progress: number;
	stats: CatchupStats;
	done: boolean;
}

export function useGameLifecycle(): {
	catchup: CatchupState | null;
	dismissCatchup: () => void;
} {
	const [catchup, setCatchup] = useState<CatchupState | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const catchingUpRef = useRef(false);

	useEffect(() => {
		// The loop owes time by the wall clock, not by its own period: a throttled
		// or suspended interval raises no visibility event, so the gap between two
		// fires is the only dependable signal that time passed.
		let lastWallAt = Date.now();
		let carryMs = 0;

		function runOneTick(): void {
			// 1. Advance game tick (the accumulator drains exact TICK_MS steps)
			useGameStore.getState().tick(TICK_MS);

			// 2. Advance the running engines and resolve any finished fights
			const { combatEngines, derived, resolveFight, removeCombatEngine } =
				useGameStore.getState();
			for (const f of stepLiveFights(
				combatEngines,
				derived.combatSpeedMultiplier,
			)) {
				resolveFight(f.squadId, f.winner, f.survivorsByType);
				removeCombatEngine(f.squadId);
			}

			// 3. Start engines for squads that just entered fighting. Last, so a
			// new fight's first step falls on the next tick — see beginLiveFights.
			const current = useGameStore.getState();
			for (const [squadId, engine] of beginLiveFights(
				current,
				current.combatEngines,
			)) {
				current.addCombatEngine(squadId, engine);
			}
		}

		function startInterval(): void {
			// Guard first: a running loop owns `lastWallAt`.
			if (intervalRef.current !== null) return;
			lastWallAt = Date.now();
			carryMs = 0;
			intervalRef.current = setInterval(() => {
				const now = Date.now();
				const elapsed = now - lastWallAt;
				lastWallAt = now;

				// An absence, not a late timer — too many ticks to grind through here.
				if (elapsed > CATCHUP_THRESHOLD_MS) {
					carryMs = 0;
					runCatchup(true);
					return;
				}

				// Clamped against a clock that jumped backwards.
				carryMs += Math.max(0, elapsed);
				while (carryMs >= TICK_MS) {
					carryMs -= TICK_MS;
					runOneTick();
				}
			}, TICK_MS);
		}

		function stopInterval(): void {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}

		async function runCatchup(showOverlay: boolean): Promise<void> {
			if (catchingUpRef.current) return;
			catchingUpRef.current = true;
			stopInterval();
			useGameStore.getState().clearCombatEngines();

			const elapsed = Date.now() - useGameStore.getState().meta.lastTickAt;

			let lastStats: CatchupStats = {
				eventsProcessed: 0,
				gained: zeroResources(),
			};
			let overlayShown = false;

			const rawResult = await simulateOffline(
				useGameStore.getState(),
				elapsed,
				{
					onProgress: showOverlay
						? (cursor, target, stats) => {
								if (stats) lastStats = stats;
								// Gains alone, not events: an absence that only banked passive
								// income is still worth reporting.
								const hasActivity =
									!!stats && Object.values(stats.gained).some((v) => v > 0);
								if (hasActivity) {
									overlayShown = true;
									setCatchup({
										progress: cursor / target,
										stats: lastStats,
										done: false,
									});
								}
							}
						: undefined,
				},
			);

			// Every persisted slice. Catchup advances gacha and meta too, and a
			// slice left behind is reverted by the next autosave.
			const patch: Partial<GameState> = {
				derived: recomputeDerived(rawResult),
			};
			for (const key of PERSISTED_KEYS) {
				Object.assign(patch, { [key]: rawResult[key] });
			}
			// The window catchup just paid for ends now. Leaving the pre-catchup
			// stamp on disk would credit the same absence twice if the tab closed
			// before the first live tick.
			patch.meta = { ...rawResult.meta, lastTickAt: Date.now() };

			useGameStore.setState({
				...patch,
				combatEngines: new Map<string, CombatEngine>(),
			});
			saveGame({ ...rawResult, ...patch });

			if (showOverlay && overlayShown) {
				setCatchup((prev) => (prev ? { ...prev, done: true } : null));
			}
			catchingUpRef.current = false;
			startInterval();
		}

		/** The tab is going away: stop burning battery and leave a save behind. */
		function suspend(): void {
			// Mid-catchup the stamp is the window being paid for.
			if (catchingUpRef.current) return;
			stopInterval();
			useGameStore.setState((prev) => ({
				meta: { ...prev.meta, lastTickAt: Date.now() },
			}));
			saveGame(useGameStore.getState());
		}

		/** The tab is back: pay for the absence, or just resume the loop. */
		function resume(): void {
			if (catchingUpRef.current) return;
			const elapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
			if (elapsed > CATCHUP_THRESHOLD_MS) {
				runCatchup(true);
			} else {
				startInterval();
			}
		}

		function handleVisibility(): void {
			if (document.hidden) suspend();
			else resume();
		}

		document.addEventListener("visibilitychange", handleVisibility);
		// Mobile raises some subset of these and never all, so all of them are wired
		// to the same pair. Duplicates are no-ops: `resume` re-reads the clock.
		window.addEventListener("pagehide", suspend);
		window.addEventListener("pageshow", resume);
		document.addEventListener("freeze", suspend);
		document.addEventListener("resume", resume);

		const initialElapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
		if (initialElapsed > CATCHUP_THRESHOLD_MS) {
			runCatchup(true);
		} else {
			startInterval();
		}

		return () => {
			stopInterval();
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("pagehide", suspend);
			window.removeEventListener("pageshow", resume);
			document.removeEventListener("freeze", suspend);
			document.removeEventListener("resume", resume);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	function dismissCatchup(): void {
		setCatchup(null);
	}

	return { catchup, dismissCatchup };
}
