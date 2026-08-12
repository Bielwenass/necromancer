import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RELIC_BASES } from "../../../game/data/relics";
import { formatAffixValue, getAffixLabel } from "../../../game/relics";
import type { Relic } from "../../../game/types";
import "./RelicCard.css";
import { RelicCardBack } from "./RelicCardBack";
import {
	buildBars,
	buildFoil,
	CardFrame,
	RARITIES,
	RARITY_SIGIL,
	SLOT_ART_LABELS,
} from "./relicCardArt";

// ── tweaks ───────────────────────────────────────────────────────
export interface RelicCardTweaks {
	tilt: number;
	glow: number;
	foil: number;
	gloss: number;
	noise: number;
	idleDrift: boolean;
	edgeShimmer: boolean;
	/** Total ms for the back→front flip animation. */
	revealDuration: number;
	/** 0–1 multiplier on rarity backShimmer (iridescence visible through the back). */
	backShimmer: number;
}

const DEFAULT_TWEAKS: RelicCardTweaks = {
	tilt: 12,
	glow: 0.1,
	foil: 0.6,
	gloss: 0.1,
	noise: 0.6,
	idleDrift: true,
	edgeShimmer: true,
	revealDuration: 950,
	backShimmer: 0.2,
};

const VARIANT_TWEAKS: Record<"pull" | "inventory", Partial<RelicCardTweaks>> = {
	pull: { tilt: 12, idleDrift: true, edgeShimmer: true },
	inventory: { tilt: 12, idleDrift: false, edgeShimmer: false },
};

// ── component ────────────────────────────────────────────────────
export interface RelicCardProps {
	relic: Relic;
	/** 'pull' = full card for gacha reveal; 'inventory' = condensed for item grid */
	variant?: "pull" | "inventory";
	selected?: boolean;
	tweaks?: Partial<RelicCardTweaks>;
	onClick?: () => void;
	/** When true, play the flip-reveal (back → front) animation on mount. */
	revealing?: boolean;
	/** Ms to wait before starting the flip. Use to stagger multi-card pulls. */
	revealDelay?: number;
	/** Fired after the reveal animation finishes. */
	onRevealComplete?: () => void;
}

type Phase = "hidden" | "flipping" | "revealed";

export function RelicCard({
	relic,
	variant = "pull",
	selected = false,
	tweaks: tweakOverrides,
	onClick,
	revealing = false,
	revealDelay = 0,
	onRevealComplete,
}: RelicCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number>(0);
	const timersRef = useRef<number[]>([]);
	const [hovered, setHovered] = useState(false);
	// Tri-state. When `revealing` is false we skip the animation entirely and
	// land directly in 'revealed' — the card just appears face-up.
	const [phase, setPhase] = useState<Phase>(revealing ? "hidden" : "revealed");

	const isLarge = variant === "pull";
	const R = RARITIES[relic.rarity];
	const base = RELIC_BASES.find((b) => b.id === relic.baseId);

	const tweaks: RelicCardTweaks = {
		...DEFAULT_TWEAKS,
		...VARIANT_TWEAKS[variant],
		...tweakOverrides,
	};
	const glow = tweaks.glow * R.glowMul;
	const foil = tweaks.foil * R.foilMul;
	const dur = tweaks.revealDuration;

	// Display data
	const name = base?.name ?? relic.baseId;
	const flavor = base?.description ? `"${base.description}"` : "";
	const slotKey = base?.slot ?? "crypt";
	const setLabel = base?.set ? ` · ${base?.set}` : "";
	const slotLabel = `${slotKey.charAt(0).toUpperCase()}${slotKey.slice(1)}`;
	const artLabel = SLOT_ART_LABELS[slotKey] ?? "RELIC";
	const sigil = RARITY_SIGIL[relic.rarity];
	const serial = `REL-${relic.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
	const stats = [
		{
			k: getAffixLabel(relic.mainAffix.id),
			v: formatAffixValue(
				relic.mainAffix.id,
				relic.mainAffix.value,
				relic.upgradeLevel,
			),
		},
		...relic.minorAffixes.map((a) => ({
			k: getAffixLabel(a.id),
			v: formatAffixValue(a.id, a.value, relic.upgradeLevel),
		})),
	];

	// Stable per rarity + tilt, so effects can depend on it directly instead of
	// listing the values it happens to close over.
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
			const fromDeg = (px + 0.5) * 360 + (py + 0.5) * 90;
			const sat =
				0.22 + Math.min(0.06, Math.abs(px) * 0.12 + Math.abs(py) * 0.08);
			el.style.setProperty(
				"--foil-bg",
				buildFoil(R.foilHues, sat, 78, fromDeg),
			);
		},
		[R.foilHues, tweaks.tilt],
	);

	// Reset pose when rarity or tilt changes (both captured by setPose).
	useEffect(() => {
		setPose(0, 0);
	}, [setPose]);

	// Set CSS var for animation duration so keyframes scale.
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

	// Drive the reveal sequence whenever `revealing` flips on.
	useEffect(() => {
		timersRef.current.forEach(window.clearTimeout);
		timersRef.current = [];
		if (!revealing) {
			setPhase("revealed");
			return;
		}
		setPhase("hidden");
		// Two animation frames so the browser commits 'hidden' state (back facing
		// camera) before the keyframes start — otherwise the flip starts mid-air.
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

	// Idle drift only when fully revealed and not hovered.
	useEffect(() => {
		if (!tweaks.idleDrift || hovered || phase !== "revealed") return;
		const t0 = performance.now();
		const tick = (now: number) => {
			const t = (now - t0) / 1000;
			setPose(Math.sin(t * 0.4) * 0.69, Math.cos(t * 0.31) * 0.45);
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [tweaks.idleDrift, hovered, phase, setPose]);

	const onMove = (e: React.MouseEvent) => {
		if (phase !== "revealed") return;
		const el = cardRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		setPose(
			(e.clientX - r.left) / r.width - 0.5,
			(e.clientY - r.top) / r.height - 0.5,
		);
	};

	const onLeave = () => {
		setHovered(false);
		if (phase === "revealed") setPose(0, 0);
	};

	const barsBg = buildBars(R.foilHues, 0.22, 70);

	return (
		<button
			type="button"
			// w-full is required: a <button> resolves `width: auto` as shrink-to-fit,
			// which would make the inner .relic-card's `width: 100%` circular and
			// collapse the card to a few pixels.
			className="relic-stage w-full text-left"
			data-rarity={relic.rarity}
			data-variant={variant}
			data-selected={selected ? "1" : "0"}
			data-phase={phase}
			onMouseEnter={() => phase === "revealed" && setHovered(true)}
			onMouseMove={onMove}
			onMouseLeave={onLeave}
			onClick={onClick}
		>
			{/* outer rarity glow */}
			<div
				className="relic-glow"
				style={{
					// Hidden phase is folded in here rather than fought with
					// `!important` in CSS, since this inline opacity would always win.
					opacity: phase === "hidden" ? 0 : glow * (hovered ? 1.0 : 0.55),
					background: `radial-gradient(closest-side, ${R.color}, transparent 70%)`,
				}}
			/>

			{/* mid-flip light burst */}
			<div
				className="rc-flash"
				style={{
					background: `radial-gradient(closest-side, #b8b8b8ac, ${R.color} 35%, transparent 75%)`,
				}}
			/>

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
				{/* BACK FACE */}
				<RelicCardBack R={R} backShimmer={R.backShimmer * tweaks.backShimmer} />

				{/* FRONT FACE */}
				<div className="rc-front">
					<div className="rc-face-inner">
						<div className="rc-base" />

						{/* iridescence stack */}
						<div
							className="rc-foil-wrap"
							style={{ opacity: foil * (hovered ? 1.0 : 0.55) }}
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

						{/* frame decoration */}
						<CardFrame cornerOpacity={0.5}>
							<g transform="translate(160 16)" opacity="0.55">
								<line
									x1="-40"
									y1="0"
									x2="-8"
									y2="0"
									stroke="currentColor"
									strokeWidth="0.6"
								/>
								<line
									x1="8"
									y1="0"
									x2="40"
									y2="0"
									stroke="currentColor"
									strokeWidth="0.6"
								/>
								<circle
									cx="0"
									cy="0"
									r="2.2"
									fill="none"
									stroke="currentColor"
									strokeWidth="0.8"
								/>
								<circle cx="0" cy="0" r="0.6" fill="currentColor" />
							</g>
							<g transform="translate(160 444)" opacity="0.45">
								<line
									x1="-30"
									y1="0"
									x2="-6"
									y2="0"
									stroke="currentColor"
									strokeWidth="0.5"
								/>
								<line
									x1="6"
									y1="0"
									x2="30"
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
						</CardFrame>

						<div className="rc-edge-shimmer" />

						{/* content */}
						<div className="rc-content">
							<header className="rc-head">
								<div className="rc-head-l">
									<span className="rc-glyph">{R.glyph}</span>
									<span className="rc-type">{slotLabel}</span>
									{isLarge && <span className="rc-type">{setLabel}</span>}
								</div>
								{isLarge && <span className="rc-rarity-tag">{R.label}</span>}
							</header>

							<div className="rc-art">
								<svg
									className="rc-art-stripes"
									viewBox="0 0 100 100"
									preserveAspectRatio="none"
									aria-hidden="true"
								>
									<defs>
										<pattern
											id={`stripes-${relic.id}`}
											width="6"
											height="6"
											patternUnits="userSpaceOnUse"
											patternTransform="rotate(45)"
										>
											<line
												x1="0"
												y1="0"
												x2="0"
												y2="6"
												stroke="currentColor"
												strokeWidth="0.5"
												strokeOpacity="0.4"
											/>
										</pattern>
									</defs>
									<rect
										width="100"
										height="100"
										fill={`url(#stripes-${relic.id})`}
									/>
								</svg>
								<div className="rc-art-cross">
									<span />
									<span />
								</div>
								<span className="rc-art-label">{artLabel}</span>
								<span className="rc-art-sigil">{sigil}</span>
							</div>

							<div className="rc-title">
								<h2
									className={`rc-name text-md ${isLarge ? "text-2xl" : ""}`}
									style={{ color: "var(--accent-1, #a8a39a)" }}
								>
									{name}
								</h2>
								{flavor && <p className="rc-flavor">{flavor}</p>}
							</div>

							<footer className="rc-foot">
								<ul className="rc-stats">
									{stats.map((s) => (
										<li key={s.k}>
											<span className="rc-stat-k">{s.k}</span>
											<span className="rc-stat-dot" />
											<span className="rc-stat-v">{s.v}</span>
										</li>
									))}
								</ul>
								<div className="rc-serial">№ {serial}</div>
							</footer>
						</div>

						{/* specular gloss */}
						<div
							className="rc-gloss"
							style={{
								opacity: tweaks.gloss * (hovered ? 1.0 : 0.4),
								background: `radial-gradient(
                circle at var(--mx) var(--my),
                rgba(255,255,255,0.55) 0%,
                rgba(255,255,255,0.10) 18%,
                transparent 42%
              )`,
							}}
						/>
					</div>
				</div>
			</div>
		</button>
	);
}
