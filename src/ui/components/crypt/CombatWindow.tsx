import { useEffect, useRef } from "react";
import { COMBAT_H, COMBAT_W } from "../../../combat/dungeonCombat";
import type { CombatEngine } from "../../../combat/engine";
import { useGameStore } from "../../../game/store";
import type { DungeonDef, Squad } from "../../../game/types";

// Backing-store scale for a crisp render on high-DPI screens. The sim's
// logical coordinate space (COMBAT_W × COMBAT_H) stays fixed — only the
// canvas's physical pixel buffer and a matching ctx transform grow.
const CANVAS_DPR = Math.min(window.devicePixelRatio || 1, 3);

export function CombatWindow({
	squad,
	def: _def,
}: {
	squad: Squad;
	def: DungeonDef;
}) {
	const storeEngine = useGameStore((s) => s.combatEngines.get(squad.id));
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);
	const engineRef = useRef<CombatEngine | null>(null);
	const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep local ref alive after engine is removed from store (for visual replay).
	useEffect(() => {
		if (storeEngine) {
			engineRef.current = storeEngine;
			if (restartTimeoutRef.current) {
				clearTimeout(restartTimeoutRef.current);
				restartTimeoutRef.current = null;
			}
		}
	}, [storeEngine]);

	// RAF render loop — persists for the lifetime of the component.
	useEffect(() => {
		const lastTsRef = { current: 0 };
		const lastSimTRef = { current: -1 }; // sim time at last detected tick
		const lastTickWallRef = { current: 0 }; // wall time (ms) when last tick was detected
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
					// Visual replay: tick the engine ourselves with real delta time.
					if (lastTsRef.current === 0) lastTsRef.current = ts;
					const speed = store.derived.combatSpeedMultiplier;
					const dt = Math.min(ts - lastTsRef.current, 50) * speed;
					lastTsRef.current = ts;
					eng.tick(dt);
				} else {
					lastTsRef.current = ts;
				}

				// Detect lifecycle-hook ticks by watching sim time, then extrapolate positions.
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
					}, 1500);
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
