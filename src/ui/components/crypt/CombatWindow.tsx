import { useEffect, useRef } from "react";
import { COMBAT_CONFIG } from "../../../combat/config";
import { COMBAT_H, COMBAT_W } from "../../../combat/dungeonCombat";
import type { CombatEngine } from "../../../combat/engine";
import { useGameStore } from "../../../game/store";
import type { Squad } from "../../../game/types";

// Backing-store scale for high-DPI screens. The sim's logical space
// (COMBAT_W × COMBAT_H) is untouched; this moves the pixel buffer and transform.
const CANVAS_DPR = Math.min(window.devicePixelRatio || 1, 3);

export function CombatWindow({ squad }: { squad: Squad }) {
	const storeEngine = useGameStore((s) => s.combatEngines.get(squad.id));
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);
	const engineRef = useRef<CombatEngine | null>(null);
	const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Held past the store's removal so the replay has something to draw.
	useEffect(() => {
		if (storeEngine) {
			engineRef.current = storeEngine;
			if (restartTimeoutRef.current) {
				clearTimeout(restartTimeoutRef.current);
				restartTimeoutRef.current = null;
			}
		}
	}, [storeEngine]);

	// RAF render loop, alive for the component's lifetime.
	useEffect(() => {
		const lastTsRef = { current: 0 };
		const lastSimTRef = { current: -1 };
		const lastTickWallRef = { current: 0 };
		const squadId = squad.id;

		function loop(ts: number): void {
			const eng = engineRef.current;
			const canvas = canvasRef.current;
			const ctx = canvas?.getContext("2d");

			if (eng && ctx) {
				ctx.setTransform(CANVAS_DPR, 0, 0, CANVAS_DPR, 0, 0);
				const store = useGameStore.getState();
				const isLive = store.combatEngines.has(squadId);

				if (!isLive) {
					// Replay: the engine is driven here off wall-clock delta.
					if (lastTsRef.current === 0) lastTsRef.current = ts;
					const speed = store.derived.combatSpeedMultiplier;
					const dt = Math.min(ts - lastTsRef.current, 50) * speed;
					lastTsRef.current = ts;
					eng.tick(dt);
				} else {
					lastTsRef.current = ts;
				}

				// Sim time moving marks a lifecycle tick; extrapolate between them.
				let extrapolationDt = 0;
				if (isLive) {
					const simT = eng.getT();
					if (simT !== lastSimTRef.current) {
						lastSimTRef.current = simT;
						lastTickWallRef.current = ts;
					}
					const wallElapsed = ts - lastTickWallRef.current;
					extrapolationDt =
						(wallElapsed / 1000) * store.derived.combatSpeedMultiplier;
				}

				eng.render(ctx, extrapolationDt);

				if (eng.getWinner() !== null && !restartTimeoutRef.current) {
					restartTimeoutRef.current = setTimeout(() => {
						eng.start();
						lastTsRef.current = 0;
						restartTimeoutRef.current = null;
					}, COMBAT_CONFIG.rendering.replayRestartDelayMs);
				}
			}

			rafRef.current = requestAnimationFrame(loop);
		}

		rafRef.current = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(rafRef.current);
			if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
		};
	}, [squad.id]);

	return (
		<canvas
			ref={canvasRef}
			width={COMBAT_W * CANVAS_DPR}
			height={COMBAT_H * CANVAS_DPR}
			className="block w-full aspect-[2/1]"
		/>
	);
}
