import { useCallback, useEffect, useRef, useState } from "react";
import { COMBAT_CONFIG } from "../combat/config";
import { combatDials } from "../combat/dials";
import { COMBAT_H, COMBAT_W } from "../combat/dungeonCombat";
import { ArmyPanel } from "./ArmyPanel";
import { DialPanel } from "./DialPanel";
import { type Army, armyTotal, createFight } from "./fight";
import {
	type BurstResult,
	burst,
	currentCollisionRadius,
	describeBurst,
} from "./headless";
import { type Metrics, MetricsPanel } from "./MetricsPanel";
import { NumberField } from "./NumberField";
import { Segmented } from "./Segmented";

const CANVAS_DPR = Math.min(window.devicePixelRatio || 1, 3);
const BURST_TICKS = 10000;
/** Frames a rolling ms/tick averages over, so the readout settles but still moves. */
const WINDOW_FRAMES = 30;

const EMPTY_METRICS: Metrics = {
	ticks: 0,
	perTickMs: 0,
	recentPerTickMs: 0,
	fps: 0,
	gridPct: 0,
	accelPct: 0,
	contactPairs: 0,
	damagePct: 0,
	neighborPct: 0,
	seekPct: 0,
	integratePct: 0,
	avgNeighbors: 0,
	maxNeighbors: 0,
	aliveA: 0,
	aliveB: 0,
	collisionRadius: 0,
	winner: "—",
};

export function TunePage() {
	const [armyA, setArmyA] = useState<Army>({
		skeleton: 250,
		zombie: 0,
		wraith: 0,
	});
	const [armyB, setArmyB] = useState<Army>({
		skeleton: 250,
		zombie: 0,
		wraith: 0,
	});
	const [seed, setSeed] = useState(0xcafe);
	const [speed, setSpeed] = useState(1);
	const [statsLevel, setStatsLevel] = useState<"phase" | "detail">("phase");
	const [running, setRunning] = useState(false);
	const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
	const [log, setLog] = useState<string[]>([]);
	const [busy, setBusy] = useState(false);
	const [generation, setGeneration] = useState(0);

	const dials = useRef(combatDials()).current;
	// Mirrored into state: the dials write through to COMBAT_CONFIG, which React
	// cannot see, so the mirror is what re-renders the list.
	const [dialValues, setDialValues] = useState<Record<string, number>>(() =>
		Object.fromEntries(dials.map((d) => [d.path, d.value])),
	);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const runningRef = useRef(running);
	const speedRef = useRef(speed);
	runningRef.current = running;
	speedRef.current = speed;

	const setDial = useCallback(
		(path: string, value: number) => {
			dials.find((d) => d.path === path)?.set(value);
			setDialValues((prev) => ({ ...prev, [path]: value }));
		},
		[dials],
	);

	const appendLog = useCallback((lines: string[]) => {
		setLog((prev) => [...lines, ...prev].slice(0, 12));
	}, []);

	// One fight per generation; changing armies, seed or timing starts a new one.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `generation` is the restart trigger, bumped to rebuild a fight whose settings did not change.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const engine = createFight(armyA, armyB, seed, statsLevel);

		let raf = 0;
		let last = performance.now();
		let frames = 0;
		let windowWall = 0;
		let windowTicks = 0;
		let fps = 0;
		let fpsWall = 0;

		const frame = (now: number) => {
			const elapsed = Math.min(now - last, 100);
			last = now;

			if (runningRef.current && engine.getWinner() === null) {
				const before = engine.stats.numTicks;
				const wallStart = performance.now();
				engine.tick(elapsed * speedRef.current);
				windowWall += performance.now() - wallStart;
				windowTicks += engine.stats.numTicks - before;
			}

			ctx.setTransform(CANVAS_DPR, 0, 0, CANVAS_DPR, 0, 0);
			engine.render(ctx, 0);

			frames++;
			fpsWall += elapsed;
			if (frames >= WINDOW_FRAMES) {
				fps = (frames / fpsWall) * 1000;
				const s = engine.stats;
				const phase = s.gridBuildMs + s.accelMs + s.damageMs;
				const accel = s.neighborMs + s.seekMs + s.integrateMs;
				const pct = (v: number, base: number) =>
					base > 0 ? (v / base) * 100 : 0;
				setMetrics({
					ticks: s.numTicks,
					perTickMs: s.numTicks > 0 ? s.wallTimeMs / s.numTicks : 0,
					recentPerTickMs: windowTicks > 0 ? windowWall / windowTicks : 0,
					fps,
					gridPct: pct(s.gridBuildMs, phase),
					accelPct: pct(s.accelMs, phase),
					contactPairs:
						s.unitsProcessed > 0 ? s.collisionPairs / s.unitsProcessed : 0,
					damagePct: pct(s.damageMs, phase),
					neighborPct: pct(s.neighborMs, accel),
					seekPct: pct(s.seekMs, accel),
					integratePct: pct(s.integrateMs, accel),
					avgNeighbors:
						s.unitsProcessed > 0 ? s.neighborsVisited / s.unitsProcessed : 0,
					maxNeighbors: s.maxNeighbors,
					aliveA: engine.getTotalCount("a"),
					aliveB: engine.getTotalCount("b"),
					collisionRadius: currentCollisionRadius(armyA, armyB),
					winner: engine.getWinner() ?? "—",
				});
				frames = 0;
				fpsWall = 0;
				windowWall = 0;
				windowTicks = 0;
			}

			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	}, [armyA, armyB, seed, statsLevel, generation]);

	const restart = () => {
		setMetrics(EMPTY_METRICS);
		setGeneration((g) => g + 1);
	};

	// Headless work blocks the frame, so the button paints its disabled state first.
	const runHeadless = (make: () => BurstResult[]) => {
		setBusy(true);
		setTimeout(() => {
			appendLog(make().map(describeBurst));
			setBusy(false);
		}, 0);
	};

	const total = armyTotal(armyA) + armyTotal(armyB);

	return (
		<div className="min-h-screen bg-bg-canvas p-4 text-bone">
			<div className="mx-auto flex max-w-[1400px] flex-col gap-4">
				<header className="flex items-baseline justify-between border-b border-[color:var(--rule-strong)] pb-2">
					<h1 className="font-display text-sm uppercase tracking-[0.28em] text-parchm">
						Combat Tuning
					</h1>
					<span className="font-mono text-[10px] text-dim">
						{COMBAT_W}×{COMBAT_H} · {total} units · dev only
					</span>
				</header>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">
					<section className="flex flex-col gap-4">
						<ArmyPanel label="Side A" army={armyA} onChange={setArmyA} />
						<ArmyPanel label="Side B" army={armyB} onChange={setArmyB} />
						<div className="border-t border-[color:var(--rule)] pt-2">
							<NumberField
								label="seed"
								value={seed}
								step={1}
								onChange={setSeed}
							/>
							<NumberField
								label="speed ×"
								value={speed}
								step={1}
								min={1}
								onChange={setSpeed}
							/>
						</div>
					</section>

					<section className="flex flex-col gap-3">
						<div className="border border-[color:var(--rule-strong)]">
							<canvas
								ref={canvasRef}
								width={COMBAT_W * CANVAS_DPR}
								height={COMBAT_H * CANVAS_DPR}
								className="block w-full aspect-[2/1]"
								style={{ background: COMBAT_CONFIG.rendering.backgroundColor }}
							/>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setRunning((r) => !r)}
								className="border border-[color:var(--rule-strong)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-bg-hover"
							>
								{running ? "Pause" : "Run"}
							</button>
							<button
								type="button"
								onClick={restart}
								className="border border-[color:var(--rule-strong)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-bg-hover"
							>
								Restart
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() =>
									runHeadless(() => [
										burst(armyA, armyB, seed, BURST_TICKS, "burst"),
									])
								}
								className="border border-[color:var(--rule-strong)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-bg-hover disabled:text-dim"
							>
								Headless burst
							</button>
						</div>

						<div>
							<div className="pb-1 font-mono text-[10px] text-dim">
								timing (detail costs 6 timers per unit)
							</div>
							<Segmented
								value={statsLevel}
								options={["phase", "detail"] as const}
								onChange={setStatsLevel}
							/>
						</div>

						{log.length > 0 && (
							<pre className="max-h-40 overflow-auto border border-[color:var(--rule)] bg-bg-inset p-2 font-mono text-[10px] leading-relaxed text-parchm">
								{log.join("\n")}
							</pre>
						)}
					</section>

					<section className="flex flex-col gap-4">
						<MetricsPanel metrics={metrics} detail={statsLevel === "detail"} />
						<div className="border-t border-[color:var(--rule-strong)]">
							<DialPanel dials={dials} values={dialValues} onSet={setDial} />
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
