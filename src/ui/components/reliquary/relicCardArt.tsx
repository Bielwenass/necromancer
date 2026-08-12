import type React from "react";
import type { Rarity } from "../../../game/types";
import { rarityName } from "../../theme";

// ── rarity config ────────────────────────────────────────────────
export type RarityConfig = {
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

/**
 * The card's own rarity palette. Deliberately *not* `theme.ts`'s
 * `RARITY_COLORS`: those are flat UI accents, while these are the base of a
 * layered foil treatment and carry a deep tone, two accents and a hue set that
 * the rest of the UI has no use for. Changing a rarity's look means changing
 * both.
 */
export const RARITIES: Record<Rarity, RarityConfig> = {
	common: {
		label: rarityName("common"),
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
		label: rarityName("uncommon"),
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
		label: rarityName("rare"),
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
		label: rarityName("epic"),
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
		label: rarityName("legendary"),
		glyph: "✠",
		color: "#f3c0a8",
		deep: "#6a2e1e",
		accents: ["#ffc099", "#fa8163"],
		foilHues: [80, 60, 30, 110, 50, 10],
		glowMul: 1.05,
		foilMul: 1.0,
		edgeAnim: true,
		backShimmer: 0.75,
	},
};

export const RARITY_SIGIL: Record<Rarity, string> = {
	common: "I",
	uncommon: "II",
	rare: "III",
	epic: "IV",
	legendary: "V",
};

// Card-back sigil geometry, in degrees. Ticks skip every third position; the
// star chords each span 120°.
export const TICK_ANGLES = [30, 60, 120, 150, 210, 240, 300, 330];
export const STAR_ANGLES = [-90, -30, 30, 90, 150, 210];

// Corner brackets: [x, y, rotation].
export const CARD_CORNERS: [number, number, number][] = [
	[15, 15, 0],
	[305, 15, 90],
	[15, 445, 270],
	[305, 445, 180],
];

export const SLOT_ART_LABELS: Record<string, string> = {
	crypt: "CRYPT RELIC",
	skeleton: "BONE CHARM",
	zombie: "PLAGUE RELIC",
	wraith: "SPECTRAL RELIC",
};

// ── foil builders ────────────────────────────────────────────────
export function buildFoil(
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

export function buildBars(hues: number[], sat: number, light: number): string {
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

// ── frame ────────────────────────────────────────────────────────
interface CardFrameProps {
	/** The back draws its corner brackets harder than the front does. */
	cornerOpacity: number;
	/** Extra frame furniture — the front hangs its title rule off the top. */
	children?: React.ReactNode;
}

/** The double border and corner brackets shared by both card faces. */
export function CardFrame({ cornerOpacity, children }: CardFrameProps) {
	return (
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
				<g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${deg})`}>
					<path
						d="M -8 0 L 0 0 L 0 -8"
						fill="none"
						stroke="currentColor"
						strokeOpacity={cornerOpacity}
						strokeWidth="0.9"
					/>
				</g>
			))}
			{children}
		</svg>
	);
}
