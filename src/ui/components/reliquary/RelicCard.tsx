import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Relic } from "../../../game/types";
import { getLean, subscribeLean } from "../../deviceLean";
import { onFrame } from "../../frameClock";
import "./RelicCard.css";
import { cardContent } from "./cardContent";
import { RelicCardBack } from "./RelicCardBack";
import { RelicCardCompact } from "./RelicCardCompact";
import { RelicCardFull } from "./RelicCardFull";
import { buildBars, buildFoil, CardFrame, RARITIES } from "./relicCardArt";

export interface RelicCardTweaks {
	tilt: number;
	foil: number;
	noise: number;
	idleDrift: boolean;
	edgeShimmer: boolean;
	revealDuration: number;
}

export const DEFAULT_TWEAKS: RelicCardTweaks = {
	tilt: 12,
	foil: 0.6,
	noise: 0.6,
	idleDrift: true,
	edgeShimmer: true,
	revealDuration: 950,
};

const VARIANT_TWEAKS: Record<"pull" | "inventory", Partial<RelicCardTweaks>> = {
	pull: {},
	inventory: { idleDrift: false, edgeShimmer: false },
};

const TITLE_RULES: [number, number][] = [
	[18, 0],
	[442, 180],
];

/** Seconds the drift takes to reach full swing, so it always leaves from rest. */
const DRIFT_EASE_IN = 0.8;

export interface RelicCardProps {
	relic: Relic;
	/** 'pull' = full card for gacha reveal; 'inventory' = condensed for item grid */
	variant?: "pull" | "inventory";
	selected?: boolean;
	/** Which face is up while not revealing; the reveal always turns back → front. */
	face?: "front" | "back";
	tweaks?: Partial<RelicCardTweaks>;
	onClick?: () => void;
	revealing?: boolean;
	/** Ms to wait before starting the flip. Use to stagger multi-card pulls. */
	revealDelay?: number;
	onRevealComplete?: () => void;
}

type Phase = "hidden" | "flipping" | "revealed";

/** Spreads the drift of a wall of cards, so they never swing as one block. */
function driftOffset(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
	return h / 1000;
}

export function RelicCard({
	relic,
	variant = "pull",
	selected = false,
	face = "front",
	tweaks: tweakOverrides,
	onClick,
	revealing = false,
	revealDelay = 0,
	onRevealComplete,
}: RelicCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const timersRef = useRef<number[]>([]);
	const [hovered, setHovered] = useState(false);
	const [reduceMotion] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	// Tri-state; with `revealing` false the card lands directly in 'revealed'.
	const [phase, setPhase] = useState<Phase>(revealing ? "hidden" : "revealed");

	const R = RARITIES[relic.rarity];
	const content = useMemo(() => cardContent(relic), [relic]);

	const tweaks: RelicCardTweaks = {
		...DEFAULT_TWEAKS,
		...VARIANT_TWEAKS[variant],
		...tweakOverrides,
	};
	const foil = tweaks.foil * R.foilMult;
	const dur = tweaks.revealDuration;

	// Stable per rarity + tilt, so effects can depend on it directly.
	const setPose = useCallback(
		(px: number, py: number) => {
			const el = cardRef.current;
			if (!el) return;
			el.style.setProperty("--rx", `${(-py * tweaks.tilt).toFixed(2)}deg`);
			el.style.setProperty("--ry", `${(px * tweaks.tilt).toFixed(2)}deg`);
			el.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(2)}%`);
			el.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(2)}%`);
			el.style.setProperty("--bar-x", `${(px * 60).toFixed(1)}%`);
			el.style.setProperty("--bar-y", `${(py * 60).toFixed(1)}%`);
			const fromDeg = (px + 0.5) * 270 + (py + 0.5) * 90;
			const sat =
				0.275 + Math.min(0.075, Math.abs(px) * 0.15 + Math.abs(py) * 0.1);
			el.style.setProperty(
				"--foil-bg",
				buildFoil(R.foilHues, sat, 82, fromDeg),
			);
		},
		[R.foilHues, tweaks.tilt],
	);

	useEffect(() => {
		setPose(0, 0);
	}, [setPose]);

	useEffect(() => {
		cardRef.current?.parentElement?.style.setProperty(
			"--reveal-duration",
			`${dur}ms`,
		);
	}, [dur]);

	// Held in a ref so an inline parent callback can't restart the reveal.
	const onRevealCompleteRef = useRef(onRevealComplete);
	useEffect(() => {
		onRevealCompleteRef.current = onRevealComplete;
	}, [onRevealComplete]);

	useEffect(() => {
		timersRef.current.forEach(window.clearTimeout);
		timersRef.current = [];
		if (!revealing) {
			setPhase("revealed");
			return;
		}
		setPhase("hidden");
		// Two frames, so the browser commits the 'hidden' pose before the keyframes
		// start and the flip begins face-down.
		const start = window.setTimeout(() => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => setPhase("flipping"));
			});
		}, revealDelay);
		const end = window.setTimeout(
			() => {
				setPhase("revealed");
				onRevealCompleteRef.current?.();
			},
			revealDelay + dur + 40,
		);
		timersRef.current = [start, end];
		return () => {
			timersRef.current.forEach(window.clearTimeout);
		};
	}, [revealing, revealDelay, dur]);

	// Idle motion. A device that reports its orientation leans the card instead,
	// which is the phone's answer to a pointer; either way the amplitude eases up
	// from the resting pose so nothing snaps when this takes over.
	useEffect(() => {
		if (!tweaks.idleDrift || hovered || reduceMotion || phase !== "revealed") {
			return;
		}
		const t0 = performance.now();
		const o = driftOffset(relic.id);
		const unsubscribeLean = subscribeLean();
		const stop = onFrame({
			write: (now) => {
				const t = (now - t0) / 1000;
				const amp = Math.min(1, t / DRIFT_EASE_IN);
				const lean = getLean();
				if (lean) {
					setPose(lean.x * amp, lean.y * amp);
					return;
				}
				setPose(
					Math.sin((t + o) * 0.4) * 0.69 * amp,
					Math.sin((t + o) * 0.31) * 0.45 * amp,
				);
			},
		});
		return () => {
			stop();
			unsubscribeLean();
		};
	}, [tweaks.idleDrift, hovered, reduceMotion, phase, setPose, relic.id]);

	// The card turns, so the light has to travel across it. The pose comes from the
	// flip's own matrix rather than a replay of its curve, which keeps the sweep on
	// the animation however the keyframes are retimed, and lands it at rest.
	useEffect(() => {
		if (phase !== "flipping") return;
		const el = cardRef.current;
		if (!el) return;
		let px = 0;
		const stop = onFrame({
			read: () => {
				const t = getComputedStyle(el).transform;
				if (!t.startsWith("matrix")) return;
				// rotateY(a) holds cos a in m11 and -sin a in m13; the scale divides out.
				const m = new DOMMatrixReadOnly(t);
				// Wrapped to [-90, 270), the arc the flip actually walks, so the start
				// reads as +180 and the landing overshoot stays negative.
				const deg =
					(((Math.atan2(-m.m13, m.m11) * 180) / Math.PI + 450) % 360) - 90;
				px = Math.max(-1, Math.min(1, deg / 90));
			},
			write: () => setPose(px, 0),
		});
		return () => {
			stop();
			// The settled card holds whatever pose it was left in, so hand it back at
			// rest for the idle drift to leave from.
			setPose(0, 0);
		};
	}, [phase, setPose]);

	// Pointer, not mouse: a finger dragged across a card tilts it the same way.
	const onPointerMove = (e: React.PointerEvent) => {
		if (phase !== "revealed") return;
		const el = cardRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		setPose(
			(e.clientX - r.left) / r.width - 0.5,
			(e.clientY - r.top) / r.height - 0.5,
		);
	};

	const rest = () => {
		setHovered(false);
		if (phase === "revealed") setPose(0, 0);
	};

	// A mouse keeps its pose after a click; a finger lifting off ends the touch.
	const onPointerUp = (e: React.PointerEvent) => {
		if (e.pointerType !== "mouse") rest();
	};

	const barsBg = buildBars(R.foilHues, 0.22, 70);
	// The back is only ever seen face-up or mid-reveal; a grid of settled cards
	// carries none of its line work.
	const showBack = face === "back" || phase !== "revealed";

	return (
		<button
			type="button"
			// w-full is required: a <button> resolves `width: auto` as shrink-to-fit,
			// making the inner .relic-card's `width: 100%` circular.
			className="relic-stage w-full text-left"
			data-rarity={relic.rarity}
			data-variant={variant}
			data-selected={selected ? "1" : "0"}
			data-phase={phase}
			data-face={face}
			onPointerEnter={() => phase === "revealed" && setHovered(true)}
			onPointerMove={onPointerMove}
			onPointerLeave={rest}
			onPointerUp={onPointerUp}
			onPointerCancel={rest}
			onClick={onClick}
		>
			<div
				ref={cardRef}
				className="relic-card"
				data-hovered={hovered ? "1" : "0"}
				data-edge-anim={R.edgeAnim && tweaks.edgeShimmer ? "1" : "0"}
				style={
					{
						"--rarity-color": R.color,
						"--rarity-deep": R.deep,
						"--accent-1": R.accents[0],
						"--accent-2": R.accents[1],
					} as React.CSSProperties
				}
			>
				{showBack && <RelicCardBack noise={tweaks.noise} />}

				<div className="rc-front">
					<div className="rc-face-inner">
						<div className="rc-base" />

						{/* iridescence stack */}
						<div
							className="rc-foil-wrap"
							style={{
								opacity: foil * (hovered || phase === "flipping" ? 1.0 : 0.55),
							}}
						>
							<div className="rc-foil rc-foil-spectrum" />
							<div
								className="rc-foil rc-foil-bars"
								style={{ backgroundImage: barsBg }}
							/>
							<div className="rc-foil rc-foil-sparkle" />
							<div className="rc-foil rc-foil-burst" />
						</div>

						<div className="rc-noise" style={{ opacity: tweaks.noise }} />

						<CardFrame cornerOpacity={0.65}>
							{/* Title rules, the lower one the upper turned over. They frame a
							    title block only the full layout prints. */}
							{variant === "pull" &&
								TITLE_RULES.map(([y, deg]) => (
									<g
										key={y}
										transform={`translate(160 ${y}) rotate(${deg})`}
										opacity="0.65"
									>
										<line
											x1="-50"
											y1="0"
											x2="-10"
											y2="0"
											stroke="currentColor"
											strokeWidth="0.5"
										/>
										<line
											x1="10"
											y1="0"
											x2="50"
											y2="0"
											stroke="currentColor"
											strokeWidth="0.5"
										/>
										<path
											d="M -6 -3 L 0 0 L 6 -3 L 0 3 Z"
											fill="currentColor"
											fillOpacity="0.7"
										/>
									</g>
								))}
						</CardFrame>

						<div className="rc-edge-shimmer" />

						{variant === "pull" ? (
							<RelicCardFull
								relic={relic}
								content={content}
								interactive={phase === "revealed"}
							/>
						) : (
							<RelicCardCompact relic={relic} content={content} />
						)}
					</div>
				</div>
			</div>
		</button>
	);
}
