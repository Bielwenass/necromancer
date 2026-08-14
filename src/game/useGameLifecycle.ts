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
	/**
	 * The mounted effect's `startInterval`, or null between mounts. A catchup can
	 * outlive the effect that began it, and restarts whoever is mounted by then.
	 */
	const startRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		// The loop owes time by the wall clock: a throttled interval raises no
		// visibility event, so the gap between fires is the only signal.
		let lastWallAt = Date.now();
		let carryMs = 0;

		function runOneTick(): void {
			// Advance the simulation by one tick
			useGameStore.getState().tick();

			// Advance the running engines and resolve any finished fights
			const { combatEngines, derived, resolveFight, removeCombatEngine } =
				useGameStore.getState();
			for (const f of stepLiveFights(
				combatEngines,
				derived.combatSpeedMultiplier,
			)) {
				resolveFight(f.squadId, f.winner, f.survivorsByType);
				removeCombatEngine(f.squadId);
			}

			// Last, so a new fight's first step falls on the next tick.
			const current = useGameStore.getState();
			for (const [squadId, engine] of beginLiveFights(
				current,
				current.combatEngines,
			)) {
				current.addCombatEngine(squadId, engine);
			}
		}

		/**
		 * `owedMs` is time stamped into `lastTickAt` that no catchup pays for: a
		 * hidden span under the threshold, carried in so it isn't lost.
		 */
		function startInterval(owedMs = 0): void {
			// A running loop owns `lastWallAt`.
			if (intervalRef.current !== null) return;
			lastWallAt = Date.now();
			carryMs = Math.max(0, owedMs);
			intervalRef.current = setInterval(() => {
				const now = Date.now();
				const elapsed = now - lastWallAt;
				lastWallAt = now;

				// An absence: too many ticks to grind through here.
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
			// An earlier absence's overlay would linger if this window banks nothing.
			if (showOverlay) setCatchup(null);

			try {
				await payForAbsence(showOverlay);
			} catch (e) {
				// Forfeited: a retry would throw again and never restart the loop.
				console.warn("Catchup failed:", e);
				useGameStore.setState((prev) => ({
					meta: { ...prev.meta, lastTickAt: Date.now() },
				}));
			} finally {
				catchingUpRef.current = false;
				// Null when the effect that began this catchup is already gone.
				startRef.current?.();
			}
		}

		async function payForAbsence(showOverlay: boolean): Promise<void> {
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
								// Gains alone: passive income is worth reporting.
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

			// Every persisted slice: a slice left behind is reverted by the next save.
			const patch: Partial<GameState> = {
				derived: recomputeDerived(rawResult),
			};
			for (const key of PERSISTED_KEYS) {
				Object.assign(patch, { [key]: rawResult[key] });
			}
			// A stale stamp would credit the same absence twice.
			patch.meta = { ...rawResult.meta, lastTickAt: Date.now() };

			useGameStore.setState({
				...patch,
				combatEngines: new Map<string, CombatEngine>(),
			});
			saveGame({ ...rawResult, ...patch });

			if (showOverlay && overlayShown) {
				setCatchup((prev) => (prev ? { ...prev, done: true } : null));
			}
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
				startInterval(elapsed);
			}
		}

		function handleVisibility(): void {
			if (document.hidden) suspend();
			else resume();
		}

		document.addEventListener("visibilitychange", handleVisibility);
		// Mobile raises some subset of these; duplicates are no-ops.
		window.addEventListener("pagehide", suspend);
		window.addEventListener("pageshow", resume);
		document.addEventListener("freeze", suspend);
		document.addEventListener("resume", resume);

		startRef.current = startInterval;

		const initialElapsed = Date.now() - useGameStore.getState().meta.lastTickAt;
		if (initialElapsed > CATCHUP_THRESHOLD_MS) {
			runCatchup(true);
		} else {
			startInterval(initialElapsed);
		}

		return () => {
			if (startRef.current === startInterval) startRef.current = null;
			stopInterval();
			document.removeEventListener("visibilitychange", handleVisibility);
			window.removeEventListener("pagehide", suspend);
			window.removeEventListener("pageshow", resume);
			document.removeEventListener("freeze", suspend);
			document.removeEventListener("resume", resume);
		};
	}, []);

	function dismissCatchup(): void {
		setCatchup(null);
	}

	return { catchup, dismissCatchup };
}
