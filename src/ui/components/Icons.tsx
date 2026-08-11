import type React from "react";

interface IconProps {
	size?: number;
	color?: string;
}

export const IconBone = ({ size = 14, color = "var(--c-bone)" }: IconProps) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M5.2 6.4a2.6 2.6 0 1 1 3.7 3.7l-0.4 0.4 6 6 0.4-0.4a2.6 2.6 0 1 1 3.7 3.7 2.6 2.6 0 1 1-3.7 3.7l0.4-0.4-6-6-0.4 0.4a2.6 2.6 0 1 1-3.7-3.7 2.6 2.6 0 1 1 3.7-3.7Z"
			stroke={color}
			strokeWidth="1.4"
		/>
	</svg>
);

export const IconCoin = ({ size = 14, color = "var(--c-coin)" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.4" />
		<circle
			cx="12"
			cy="12"
			r="4"
			stroke={color}
			strokeWidth="1.4"
			opacity="0.6"
		/>
		<circle cx="12" cy="12" r="1.2" fill={color} />
	</svg>
);

export const IconSoul = ({ size = 14, color = "var(--c-soul)" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M12 3c2.5 2 4 4 4 6.5 0 1.6-1 2.5-2 3-1 0.5-1.5 1.4-1.5 2.5 0 1.4 1.2 2.5 2.5 2.5"
			stroke={color}
			strokeWidth="1.4"
			strokeLinecap="round"
		/>
		<circle cx="12" cy="20" r="1.3" fill={color} opacity="0.8" />
		<circle cx="9.5" cy="17.5" r="0.8" fill={color} opacity="0.5" />
	</svg>
);

export const IconHex = ({
	size = 14,
	color = "currentColor",
	filled = false,
}: IconProps & { filled?: boolean }) => (
	<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
		<polygon
			points="12,2 22,7 22,17 12,22 2,17 2,7"
			fill={filled ? color : "none"}
			stroke={color}
			strokeWidth="1.4"
		/>
	</svg>
);

export const IconSkull = ({ size = 14, color = "currentColor" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M5 10.5C5 6.9 8.1 4 12 4s7 2.9 7 6.5v3l-2 1v3h-2v-2h-1v2h-4v-2H9v2H7v-3l-2-1v-3Z"
			stroke={color}
			strokeWidth="1.3"
		/>
		<circle cx="9.3" cy="11.2" r="1.3" fill={color} />
		<circle cx="14.7" cy="11.2" r="1.3" fill={color} />
		<path d="M11 14h2" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
	</svg>
);

export const IconRuin = ({ size = 14, color = "currentColor" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M3 20h18M5 20V9l3-2v13M14 20V6l3-2v16M9 20v-6h4v6"
			stroke={color}
			strokeWidth="1.3"
			strokeLinejoin="round"
		/>
	</svg>
);

export const IconTower = ({ size = 14, color = "currentColor" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M9 20V8h6v12M11 8V5l1-2 1 2v3M7 20l2-2h6l2 2M10 12h4M10 16h4"
			stroke={color}
			strokeWidth="1.3"
			strokeLinejoin="round"
		/>
	</svg>
);

export const IconCrypt = ({ size = 14, color = "currentColor" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M4 20V10l8-6 8 6v10M10 20v-6h4v6"
			stroke={color}
			strokeWidth="1.3"
			strokeLinejoin="round"
		/>
		<circle cx="12" cy="9" r="1" fill={color} />
	</svg>
);

export const IconChest = ({ size = 14, color = "currentColor" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<rect x="4" y="9" width="16" height="11" stroke={color} strokeWidth="1.3" />
		<path
			d="M4 9c0-2 2-4 8-4s8 2 8 4M11 13h2v3h-2z"
			stroke={color}
			strokeWidth="1.3"
		/>
	</svg>
);

export const IconArrow = ({ size = 14, color = "currentColor" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M5 12h14M13 6l6 6-6 6"
			stroke={color}
			strokeWidth="1.4"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const IconDust = ({
	size = 14,
	color = "var(--ink-muted)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<circle cx="12" cy="12" r="3" fill={color} opacity="0.8" />
		<circle cx="6" cy="8" r="1.5" fill={color} opacity="0.4" />
		<circle cx="18" cy="8" r="1.5" fill={color} opacity="0.4" />
		<circle cx="6" cy="16" r="1.5" fill={color} opacity="0.4" />
		<circle cx="18" cy="16" r="1.5" fill={color} opacity="0.4" />
	</svg>
);

export const IconCorpse = ({
	size = 14,
	color = "var(--sq-zombie)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M5 18 L12 6 L19 18"
			stroke={color}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
		<path d="M8 14h8" stroke={color} strokeWidth="1" opacity="0.6" />
	</svg>
);

// Node icons for upgrades tree
export const NODE_ICONS: Record<string, (color: string) => React.ReactElement> =
	{
		army: (c) => (
			<g>
				<circle cx="0" cy="-3" r="3" fill={c} />
				<circle cx="-5" cy="3" r="3" fill={c} />
				<circle cx="5" cy="3" r="3" fill={c} />
			</g>
		),
		fast: (c) => <path d="M-6 -4 L6 0 L-6 4 Z" fill={c} />,
		bone: (c) => (
			<g>
				<rect x="-6" y="-1" width="12" height="2" fill={c} />
				<circle cx="-6" cy="0" r="2.5" fill={c} />
				<circle cx="6" cy="0" r="2.5" fill={c} />
			</g>
		),
		zombie: (c) => (
			<circle cx="0" cy="0" r="6" fill="none" stroke={c} strokeWidth="2" />
		),
		wraith: (c) => (
			<g>
				<circle cx="0" cy="0" r="5" fill={c} opacity="0.5" />
				<circle cx="0" cy="0" r="3" fill={c} />
			</g>
		),
		knight: (c) => <path d="M0 -7 L4 -2 L4 6 L-4 6 L-4 -2 Z" fill={c} />,
		circle: (c) => (
			<circle cx="0" cy="0" r="6" fill="none" stroke={c} strokeWidth="1.5" />
		),
		triple: (c) => (
			<g>
				<circle cx="-4" cy="2" r="3" fill={c} />
				<circle cx="4" cy="2" r="3" fill={c} />
				<circle cx="0" cy="-4" r="3" fill={c} />
			</g>
		),
		mass: (c) => (
			<g>
				{[0, 1, 2, 3, 4].map((i) => (
					<circle key={i} cx={-6 + i * 3} cy="0" r="1.6" fill={c} />
				))}
			</g>
		),
		reanim: (c) => (
			<path d="M-5 4 Q -5 -5 0 -5 Q 5 -5 5 0 L 4 0 L 6 2 L 3 2 Z" fill={c} />
		),
		auto: (c) => (
			<path
				d="M-5 -4 L 0 0 L -5 4 M 0 -4 L 5 0 L 0 4"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		target: (c) => (
			<g>
				<circle cx="0" cy="0" r="6" fill="none" stroke={c} strokeWidth="1" />
				<circle cx="0" cy="0" r="2" fill={c} />
			</g>
		),
		aggro: (c) => (
			<path d="M0 -6 L4 -1 L6 -2 L5 4 L0 6 L-5 4 L-6 -2 L-4 -1 Z" fill={c} />
		),
		caution: (c) => (
			<path
				d="M-5 -4 L5 -4 L5 0 Q 5 5 0 6 Q -5 5 -5 0 Z"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		heal: (c) => (
			<path
				d="M-1.5 -6 H1.5 V-1.5 H6 V1.5 H1.5 V6 H-1.5 V1.5 H-6 V-1.5 H-1.5 Z"
				fill={c}
			/>
		),
		tactics: (c) => (
			<g>
				<rect x="-6" y="-6" width="4" height="4" fill={c} />
				<rect x="2" y="-6" width="4" height="4" fill={c} />
				<rect x="-6" y="2" width="4" height="4" fill={c} />
				<rect x="2" y="2" width="4" height="4" fill={c} />
			</g>
		),
		retreat: (c) => (
			<path d="M5 -4 L-5 0 L5 4" fill="none" stroke={c} strokeWidth="2" />
		),
		vamp: (c) => <path d="M-4 -5 L0 5 L4 -5 Z" fill={c} />,
		synergy: (c) => (
			<g>
				<circle cx="-3" cy="0" r="3" fill="none" stroke={c} strokeWidth="1.5" />
				<circle cx="3" cy="0" r="3" fill="none" stroke={c} strokeWidth="1.5" />
			</g>
		),
		drum: (c) => (
			<ellipse
				cx="0"
				cy="0"
				rx="6"
				ry="3.5"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		cry: (c) => (
			<path
				d="M-5 -5 L0 0 L-5 5 M-1 -5 L4 0 L-1 5"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		soul: (c) => (
			<path
				d="M0 -6 Q 4 -4 4 0 Q 4 4 0 6 Q -4 4 -4 0 Q -4 -4 0 -6 Z"
				fill={c}
			/>
		),
		surge: (c) => (
			<path
				d="M-5 4 L-2 -4 L1 2 L4 -4"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		plague: (c) => (
			<g>
				<circle cx="0" cy="0" r="2" fill={c} />
				<circle cx="-4" cy="-3" r="1.5" fill={c} />
				<circle cx="4" cy="-2" r="1.5" fill={c} />
				<circle cx="-3" cy="3" r="1.5" fill={c} />
				<circle cx="4" cy="4" r="1.5" fill={c} />
			</g>
		),
		aura: (c) => (
			<g>
				<circle cx="0" cy="0" r="3" fill={c} />
				<circle
					cx="0"
					cy="0"
					r="6"
					fill="none"
					stroke={c}
					strokeWidth="0.8"
					strokeDasharray="2 2"
				/>
			</g>
		),
		rez: (c) => (
			<path
				d="M-4 5 L-4 -2 Q -4 -5 0 -5 Q 4 -5 4 -2 L4 5"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		drain: (c) => (
			<path d="M-5 -5 L5 5 M-5 5 L5 -5" stroke={c} strokeWidth="1.5" />
		),
		lich: (c) => (
			<g>
				<polygon points="0,-6 5,-2 4,5 -4,5 -5,-2" fill={c} />
				<circle cx="-2" cy="0" r="1" fill="var(--bg-panel)" />
				<circle cx="2" cy="0" r="1" fill="var(--bg-panel)" />
			</g>
		),
		phyl: (c) => (
			<path
				d="M0 -6 L5 -3 L5 3 L0 6 L-5 3 L-5 -3 Z"
				fill="none"
				stroke={c}
				strokeWidth="1.5"
			/>
		),
		domain: (c) => (
			<g>
				<circle cx="0" cy="0" r="5" fill="none" stroke={c} strokeWidth="1" />
				<circle cx="0" cy="0" r="3" fill="none" stroke={c} strokeWidth="1" />
				<circle cx="0" cy="0" r="1" fill={c} />
			</g>
		),
		pact: (c) => <path d="M-5 0 H-1 L0 -5 L1 0 H5 L3 4 H-3 Z" fill={c} />,
		forbid: (c) => (
			<g>
				<circle cx="0" cy="0" r="6" fill="none" stroke={c} strokeWidth="1" />
				<path d="M-4 -4 L4 4" stroke={c} strokeWidth="1.5" />
			</g>
		),
		apoth: (c) => (
			<g>
				<polygon
					points="0,-7 7,7 -7,7"
					fill="none"
					stroke={c}
					strokeWidth="1.5"
				/>
				<circle cx="0" cy="2" r="2" fill={c} />
			</g>
		),
	};

export function NodeIcon({
	kind,
	size = 16,
	color = "currentColor",
}: {
	kind: string;
	size?: number;
	color?: string;
}) {
	const fn = NODE_ICONS[kind];
	if (!fn) return null;
	return (
		<svg
			aria-hidden="true"
			width={size}
			height={size}
			viewBox="-10 -10 20 20"
			className="block"
		>
			{fn(color)}
		</svg>
	);
}
