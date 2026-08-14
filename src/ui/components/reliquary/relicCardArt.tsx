import type React from "react";
import type { Rarity } from "../../../game/types";
import { rarityName } from "../../theme";
import {
	IconRarityCommon,
	IconRarityEpic,
	IconRarityLegendary,
	IconRarityRare,
	IconRarityUncommon,
} from "../icons/RarityIcons";

export type RarityConfig = {
	label: string;
	glyph: React.ReactNode;
	color: string;
	deep: string;
	accents: [string, string];
	foilHues: number[];
	foilMult: number;
	edgeAnim: boolean;
};

/**
 * The card's own rarity palette, separate from `theme.ts`'s flat UI accents in
 * `RARITY_COLORS`. These carry a deep tone, two accents and a hue for a layered
 * foil treatment. Changing a rarity's look means changing both.
 */
export const RARITIES: Record<Rarity, RarityConfig> = {
	common: {
		label: rarityName("common"),
		glyph: IconRarityCommon({ size: 20, color: "currentColor" }),
		color: "#a8a39a",
		deep: "#3a352e",
		accents: ["#cfc7b8", "#7e7669"],
		foilHues: [40, 60, 50],
		foilMult: 0.15,
		edgeAnim: false,
	},
	uncommon: {
		label: rarityName("uncommon"),
		glyph: IconRarityUncommon({ size: 20, color: "currentColor" }),
		color: "#8fb78a",
		deep: "#1f3a26",
		accents: ["#b6d4a6", "#5a8b66"],
		foilHues: [110, 140, 180],
		foilMult: 0.25,
		edgeAnim: false,
	},
	rare: {
		label: rarityName("rare"),
		glyph: IconRarityRare({ size: 20, color: "currentColor" }),
		color: "#7aa6d6",
		deep: "#15243c",
		accents: ["#a8c8ef", "#4d75ad"],
		foilHues: [180, 220, 260],
		foilMult: 0.55,
		edgeAnim: true,
	},
	epic: {
		label: rarityName("epic"),
		glyph: IconRarityEpic({ size: 20, color: "currentColor" }),
		color: "#b083d6",
		deep: "#2c1a3d",
		accents: ["#d9b8f0", "#7e54a6"],
		foilHues: [270, 300, 340, 315],
		foilMult: 0.65,
		edgeAnim: true,
	},
	legendary: {
		label: rarityName("legendary"),
		glyph: IconRarityLegendary({ size: 20, color: "currentColor" }),
		color: "#f3c0a8",
		deep: "#6a2e1e",
		accents: ["#ffc099", "#fa8163"],
		foilHues: [55, 80, 110, 70, 115, 90],
		foilMult: 0.8,
		edgeAnim: true,
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

export const CARD_CORNERS: [number, number, number][] = [
	[18, 18, 0],
	[302, 18, 90],
	[18, 442, 270],
	[302, 442, 180],
];

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
	const step = 45 / hues.length;
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

interface CardFrameProps {
	cornerOpacity: number;
	children?: React.ReactNode;
}

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
				strokeOpacity="0.8"
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
				strokeOpacity="0.65"
				strokeWidth="0.5"
			/>
			{CARD_CORNERS.map(([x, y, deg]) => (
				<g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${deg})`}>
					<path
						d="M -12 0 L 0 0 L 0 -12"
						fill="none"
						stroke="currentColor"
						strokeOpacity={cornerOpacity}
						strokeWidth="0.45"
					/>
				</g>
			))}
			{children}
		</svg>
	);
}
