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
		function startInterval(): void {
			if (intervalRef.current !== null) return;
			intervalRef.current = setInterval(() => {
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
			const emptyStats: CatchupStats = {
				eventsProcessed: 0,
				gained: zeroResources(),
			};
			let lastStats: CatchupStats = emptyStats;
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

			// Every persisted slice, not a hand-picked few: catchup advances gacha
			// and meta too, and a slice left behind is reverted by the next autosave.
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

		function handleVisibility(): void {
			if (document.hidden) {
				stopInterval();
				useGameStore.setState((prev) => ({
					meta: { ...prev.meta, lastTickAt: Date.now() },
				}));
				saveGame(useGameStore.getState());
			} else {
				if (catchingUpRef.current) return;
				const elapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
				if (elapsed > CATCHUP_THRESHOLD_MS) {
					runCatchup(true);
				} else {
					startInterval();
				}
			}
		}

		document.addEventListener("visibilitychange", handleVisibility);

		const initialElapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
		if (initialElapsed > CATCHUP_THRESHOLD_MS) {
			runCatchup(false);
		} else {
			startInterval();
		}

		return () => {
			stopInterval();
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	function dismissCatchup(): void {
		setCatchup(null);
	}

	return { catchup, dismissCatchup };
}
