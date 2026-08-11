import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RELIC_BASES } from "../../game/data/relics";
import { formatAffixValue, getAffixLabel } from "../../game/relics";
import type { Rarity, Relic } from "../../game/types";
import "./RelicCard.css";

// ── rarity config ────────────────────────────────────────────────
type RarityConfig = {
	label: string;
	glyph: string;
	color: string;
	deep: string;
	accents: [string, string];
	foilHues: number[];
	glowMul: number;
	foilMul: number;
	edgeAnim: boolean;
	/** How much rarity-tinted iridescence leaks through the card back. 0-1. */
	backShimmer: number;
};

const RARITIES: Record<Rarity, RarityConfig> = {
	common: {
		label: "Common",
		glyph: "♦",
		color: "#a8a39a",
		deep: "#3a352e",
		accents: ["#cfc7b8", "#7e7669"],
		foilHues: [40, 60, 30],
		glowMul: 0.2,
		foilMul: 0.15,
		edgeAnim: false,
		backShimmer: 0.0,
	},
	uncommon: {
		label: "Uncommon",
		glyph: "❖",
		color: "#8fb78a",
		deep: "#1f3a26",
		accents: ["#b6d4a6", "#5a8b66"],
		foilHues: [110, 140, 180],
		glowMul: 0.5,
		foilMul: 0.25,
		edgeAnim: false,
		backShimmer: 0.75,
	},
	rare: {
		label: "Rare",
		glyph: "⋈",
		color: "#7aa6d6",
		deep: "#15243c",
		accents: ["#a8c8ef", "#4d75ad"],
		foilHues: [180, 220, 260],
		glowMul: 0.7,
		foilMul: 0.55,
		edgeAnim: true,
		backShimmer: 0.45,
	},
	epic: {
		label: "Epic",
		glyph: "❉",
		color: "#b083d6",
		deep: "#2c1a3d",
		accents: ["#d9b8f0", "#7e54a6"],
		foilHues: [270, 300, 360],
		glowMul: 0.85,
		foilMul: 0.75,
		edgeAnim: true,
		backShimmer: 0.65,
	},
	legendary: {
		label: "Legendary",
		glyph: "✠",
		color: "#f3c0a8",
		deep: "#6a2e1e",
		accents: ["#ffc099", "#fa8163"],
		// foilHues: [80, 60, 40, 100, 50, 20],
		foilHues: [80, 60, 30, 110, 50, 10],
		glowMul: 1.05,
		foilMul: 1.0,
		edgeAnim: true,
		backShimmer: 0.75,
	},
};

const RARITY_SIGIL: Record<Rarity, string> = {
	common: "I",
	uncommon: "II",
	rare: "III",
	epic: "IV",
	legendary: "V",
};

// Card-back sigil geometry, in degrees. Ticks skip every third position; the
// star chords each span 120°.
const TICK_ANGLES = [30, 60, 120, 150, 210, 240, 300, 330];
const STAR_ANGLES = [-90, -30, 30, 90, 150, 210];

// Corner brackets: [x, y, rotation].
const CARD_CORNERS: [number, number, number][] = [
	[16, 16, 0],
	[304, 16, 90],
	[16, 444, 180],
	[304, 444, 270],
];

const SLOT_ART_LABELS: Record<string, string> = {
	crypt: "CRYPT RELIC",
	skeleton: "BONE CHARM",
	zombie: "PLAGUE RELIC",
	wraith: "SPECTRAL RELIC",
};

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

// ── helpers ──────────────────────────────────────────────────────
function buildFoil(
	hues: number[],
	sat: number,
	light: number,
	fromDeg: number,
): string {
	let hs = [...hues];
	if (hs.length === 1) hs = [hs[0], (hs[0] + 60) % 360, hs[0]];
	if (hs[0] !== hs[hs.length - 1]) hs = [...hs, hs[0]];
	const stops = hs
		.map((h, i) => {
			const pct = (i / (hs.length - 1)) * 100;
			return `oklch(${light}% ${sat} ${h}) ${pct.toFixed(1)}%`;
		})
		.join(", ");
	return `conic-gradient(from ${fromDeg.toFixed(1)}deg at 50% 50%, ${stops})`;
}

function buildBars(hues: number[], sat: number, light: number): string {
	const bars: string[] = [];
	const step = 100 / hues.length;
	hues.forEach((h, i) => {
		const start = i * step;
		bars.push(`transparent ${start.toFixed(1)}%`);
		bars.push(
			`oklch(${light}% ${sat} ${h} / 0.7) ${(start + step * 0.25).toFixed(1)}%`,
		);
		bars.push(
			`oklch(${light}% ${sat} ${h} / 0.7) ${(start + step * 0.45).toFixed(1)}%`,
		);
		bars.push(`transparent ${(start + step * 0.7).toFixed(1)}%`);
	});
	return `repeating-linear-gradient(115deg, ${bars.join(", ")})`;
}

// ── card back ────────────────────────────────────────────────────
// Same silhouette across rarities to preserve the gacha mystery.
// Higher rarities leak iridescence through the back as a hype tell.
function RelicCardBack({
	R,
	backShimmer,
}: {
	R: RarityConfig;
	backShimmer: number;
}) {
	const backFoil = buildFoil(R.foilHues, 0.18, 72, 25);
	return (
		<div className="rc-back" aria-hidden>
			<div className="rc-face-inner">
				<div className="rc-back-base" />
				{backShimmer > 0 && (
					<div
						className="rc-back-foil"
						style={{
							opacity: backShimmer * 0.7,
							backgroundImage: backFoil,
						}}
					/>
				)}
				<svg
					aria-hidden="true"
					className="rc-back-seal"
					viewBox="0 0 320 460"
					preserveAspectRatio="xMidYMid meet"
				>
					<g transform="translate(160 230)">
						<circle
							r="98"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.4"
							strokeWidth="0.6"
						/>
						<circle
							r="86"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.75"
							strokeWidth="0.6"
						/>
						<circle
							r="68"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.4"
							strokeWidth="0.5"
							strokeDasharray="1.5 3"
						/>
						<circle
							r="44"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.6"
							strokeWidth="0.5"
						/>
						<circle
							r="32"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.25"
							strokeWidth="0.5"
							strokeDasharray="0.5 2"
						/>
						{[0, 90, 180, 270].map((a) => (
							<g key={a} transform={`rotate(${a})`}>
								<line
									x1="0"
									y1="-98"
									x2="0"
									y2="-86"
									stroke="currentColor"
									strokeOpacity="0.85"
									strokeWidth="0.8"
								/>
								<circle
									cx="0"
									cy="-92"
									r="1.2"
									fill="currentColor"
									fillOpacity="0.7"
								/>
							</g>
						))}
						{TICK_ANGLES.map((deg) => (
							<g key={deg} transform={`rotate(${deg})`}>
								<line
									x1="0"
									y1="-95"
									x2="0"
									y2="-88"
									stroke="currentColor"
									strokeOpacity="0.45"
									strokeWidth="0.5"
								/>
							</g>
						))}
						<g opacity="0.55">
							{STAR_ANGLES.map((deg) => {
								const a1 = (deg * Math.PI) / 180;
								const a2 = ((deg + 120) * Math.PI) / 180;
								const r = 40;
								return (
									<line
										key={deg}
										x1={Math.cos(a1) * r}
										y1={Math.sin(a1) * r}
										x2={Math.cos(a2) * r}
										y2={Math.sin(a2) * r}
										stroke="currentColor"
										strokeOpacity="0.6"
										strokeWidth="0.4"
									/>
								);
							})}
						</g>
						<circle
							r="6"
							fill="none"
							stroke="currentColor"
							strokeOpacity="0.9"
							strokeWidth="0.6"
						/>
						<circle r="1.6" fill="currentColor" fillOpacity="0.85" />
					</g>
				</svg>
				<svg
					className="rc-frame"
					viewBox="0 0 320 460"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<rect
						x="6"
						y="6"
						width="308"
						height="448"
						rx="10"
						fill="none"
						stroke="currentColor"
						strokeOpacity="0.55"
						strokeWidth="0.8"
					/>
					<rect
						x="11"
						y="11"
						width="298"
						height="438"
						rx="7"
						fill="none"
						stroke="currentColor"
						strokeOpacity="0.18"
						strokeWidth="0.5"
					/>
					{CARD_CORNERS.map(([x, y, deg]) => (
						<g
							key={`${x}-${y}`}
							transform={`translate(${x} ${y}) rotate(${deg})`}
						>
							<path
								d="M -8 0 L 0 0 L 0 -8"
								fill="none"
								stroke="currentColor"
								strokeOpacity="0.8"
								strokeWidth="0.9"
							/>
						</g>
					))}
				</svg>
				<div className="rc-noise" style={{ opacity: 0.4 }} />
				<div className="rc-back-text rc-back-text-top">NECROMANCER</div>
				<div className="rc-back-text rc-back-text-bot">RELIC · BOUND</div>
			</div>
		</div>
	);
}

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
						<svg
							className="rc-frame"
							viewBox="0 0 320 460"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							<rect
								x="6"
								y="6"
								width="308"
								height="448"
								rx="10"
								fill="none"
								stroke="currentColor"
								strokeOpacity="0.55"
								strokeWidth="0.8"
							/>
							<rect
								x="11"
								y="11"
								width="298"
								height="438"
								rx="7"
								fill="none"
								stroke="currentColor"
								strokeOpacity="0.18"
								strokeWidth="0.5"
							/>
							{CARD_CORNERS.map(([x, y, deg]) => (
								<g
									key={`${x}-${y}`}
									transform={`translate(${x} ${y}) rotate(${deg})`}
								>
									<path
										d="M -8 0 L 0 0 L 0 -8"
										fill="none"
										stroke="currentColor"
										strokeOpacity="0.8"
										strokeWidth="0.9"
									/>
								</g>
							))}
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
						</svg>

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
