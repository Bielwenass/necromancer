import { useEffect, useRef, useState } from "react";
import {
	buildAttackerConfig,
	buildDefenderConfig,
	COMBAT_H,
	COMBAT_W,
} from "../combat/dungeonCombat";
import { CombatEngine } from "../combat/engine";
import { type CatchupStats, simulateOffline } from "./catchupOffline";
import { DUNGEON_DEFS } from "./data/dungeons";
import { CATCHUP_THRESHOLD_MS, ENGINE_DT, TICK_MS } from "./data/pacing";
import { recomputeDerived } from "./rules/derived";
import { saveGame } from "./save";
import { useGameStore } from "./store";

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

				// 2. Create engines for squads that just entered fighting state
				const stateAfterTick = useGameStore.getState();
				for (const squad of stateAfterTick.squads) {
					if (
						squad.state === "fighting" &&
						squad.fightSeed !== undefined &&
						squad.targetDungeonId &&
						!stateAfterTick.combatEngines.has(squad.id)
					) {
						const def = DUNGEON_DEFS[squad.targetDungeonId];
						if (!def) continue;
						const engine = new CombatEngine({
							width: COMBAT_W,
							height: COMBAT_H,
							seed: squad.fightSeed,
						});
						engine.setSide(
							"a",
							buildAttackerConfig(squad.composition, stateAfterTick.derived),
						);
						engine.setSide("b", buildDefenderConfig(def));
						engine.start();
						stateAfterTick.addCombatEngine(squad.id, engine);
					}
				}

				// 3. Advance all active engines and resolve any finished fights
				const { combatEngines, derived, resolveFight, removeCombatEngine } =
					useGameStore.getState();
				const simMs = TICK_MS * derived.combatSpeedMultiplier;

				for (const [squadId, engine] of combatEngines) {
					let remaining = simMs;
					while (remaining >= ENGINE_DT && engine.getWinner() === null) {
						engine.tick(ENGINE_DT);
						remaining -= ENGINE_DT;
					}
					if (remaining > 0 && engine.getWinner() === null) {
						engine.tick(remaining);
					}
					const winner = engine.getWinner();
					if (winner !== null) {
						const survivorsByType = engine.getCounts().a;
						resolveFight(squadId, winner, survivorsByType);
						removeCombatEngine(squadId);
					}
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
				bonesGained: 0,
				soulsGained: 0,
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
								const hasActivity =
									!!stats &&
									stats.eventsProcessed > 0 &&
									(stats.bonesGained > 0 || stats.soulsGained > 0);
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

			const recomputed = recomputeDerived(rawResult);
			useGameStore.setState({
				resources: rawResult.resources,
				squads: rawResult.squads,
				dungeons: rawResult.dungeons,
				meta: rawResult.meta,
				derived: recomputed,
				combatEngines: new Map<string, CombatEngine>(),
			});
			saveGame({ ...rawResult, derived: recomputed });

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
