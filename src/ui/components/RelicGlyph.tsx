import type React from "react";

const GLYPH_PATHS: Record<string, React.ReactElement> = {
	skull: (
		<path d="M8 16C8 11.6 11.6 8 16 8s10 3.6 10 8.5v5l-3 2v5h-3v-3h-1v3h-6v-3h-1v3H8v-5l-2-2v-5Z" />
	),
	hex: <polygon points="20,5 32,12 32,26 20,33 8,26 8,12" />,
	star: (
		<polygon points="20,5 23,14 32,15 25,21 27,30 20,25 13,30 15,21 8,15 17,14" />
	),
	flame: (
		<path d="M20 5c2 5 8 6 8 13 0 6-3.5 12-8 12s-8-6-8-12c0-4 2-5 3-8 1 2 3 3 5-5Z" />
	),
	rune: (
		<path
			d="M10 8h20M10 20h20M10 32h20M16 8v24M24 8v24"
			stroke="currentColor"
			strokeWidth="1.5"
			fill="none"
		/>
	),
	eye: <path d="M6 20s6-9 14-9 14 9 14 9-6 9-14 9S6 20 6 20Z" />,
	drop: <path d="M20 5c5 8 9 12 9 17 0 5-4 9-9 9s-9-4-9-9c0-5 4-9 9-17Z" />,
	blade: <path d="M14 6l12 28-5 1-12-28 5-1Z" />,
	ring: (
		<circle
			cx="20"
			cy="20"
			r="11"
			fill="none"
			stroke="currentColor"
			strokeWidth="3"
		/>
	),
	spike: <path d="M20 5 28 35H12L20 5Z" />,
	cross: <path d="M16 6h8v10h10v8H24v12h-8V24H6v-8h10V6Z" />,
	moon: <path d="M26 8a13 13 0 1 0 0 24 10 10 0 1 1 0-24Z" />,
};

export function RelicGlyph({
	kind = "hex",
	size = 40,
	color = "currentColor",
}: {
	kind: string;
	size?: number;
	color?: string;
}) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 40 40"
			fill={color}
			stroke="none"
			aria-hidden="true"
			className="block"
		>
			{GLYPH_PATHS[kind] ?? GLYPH_PATHS.hex}
		</svg>
	);
}
