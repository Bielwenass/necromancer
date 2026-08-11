import type React from "react";

interface IconProps {
	size?: number;
	color?: string;
}

export const IconBone = ({ size = 14, color = "var(--c-bone)" }: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<circle cx="6" cy="9.4" r="2.9" fill={color} />
		<circle cx="6" cy="14.6" r="2.9" fill={color} />
		<circle cx="18" cy="9.4" r="2.9" fill={color} />
		<circle cx="18" cy="14.6" r="2.9" fill={color} />
		<rect x="5" y="10.1" width="14" height="3.8" rx="1" fill={color} />
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
		<path
			fillRule="evenodd"
			d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 1 0 0-18.8zm0 2.5a6.9 6.9 0 1 1 0 13.8 6.9 6.9 0 1 1 0-13.8z"
			fill={color}
		/>
		<path d="M12 7.3l3.1 4.7-3.1 4.7-3.1-4.7z" fill={color} />
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
			d="M12 2.4c.6 2.6 2.2 3.9 3.6 5.6 1.4 1.7 2.3 3.3 2.3 5.4 0 3.4-2.6 6-5.9 6s-5.9-2.6-5.9-6c0-2.4 1.3-4 2.6-5.2.3 1 .9 1.7 1.7 2 .1-3.1.4-5.6 1.6-7.8z"
			fill={color}
		/>
		<circle cx="5.1" cy="6.2" r="1.5" fill={color} />
		<circle cx="19" cy="5.3" r="1.1" fill={color} />
	</svg>
);

// export const IconDust = ({ size = 14, color = "var(--c-dust)" }: IconProps) => (
// 	<svg
// 		aria-hidden="true"
// 		width={size}
// 		height={size}
// 		viewBox="0 0 24 24"
// 		fill="none"
// 	>
// 		<path d="M2.6 20.4c1.4-4.2 4.9-7 9.4-7s8 2.8 9.4 7z" fill={color} />
// 		<circle cx="7.2" cy="8.4" r="1.5" fill={color} />
// 		<circle cx="12.4" cy="4.4" r="1.9" fill={color} />
// 		<circle cx="17.2" cy="9.1" r="1.2" fill={color} />
// 		<circle cx="12.2" cy="9.9" r="1" fill={color} />
// 	</svg>
// );

// export const IconCorpse = ({
// 	size = 14,
// 	color = "var(--c-corpse)",
// }: IconProps) => (
// 	<svg
// 		aria-hidden="true"
// 		width={size}
// 		height={size}
// 		viewBox="0 0 24 24"
// 		fill="none"
// 	>
// 		<circle cx="6.4" cy="10.8" r="2.9" fill={color} />
// 		<path d="M7.4 16.4c0-2.6 2.4-4.6 5.6-4.6s5.6 2 5.6 4.6z" fill={color} />
// 		<rect x="2.4" y="16.2" width="19.2" height="2.6" rx="1" fill={color} />
// 		<rect x="4.6" y="18.8" width="2.4" height="2.6" fill={color} />
// 		<rect x="17" y="18.8" width="2.4" height="2.6" fill={color} />
// 	</svg>
// );

// export const IconCrypt = ({
// 	size = 14,
// 	color = "var(--c-crypt)",
// }: IconProps) => (
// 	<svg
// 		aria-hidden="true"
// 		width={size}
// 		height={size}
// 		viewBox="0 0 24 24"
// 		fill="none"
// 	>
// 		<path d="M12 2.2l9.4 6.3v1.7H2.6V8.5z" fill={color} />
// 		<path
// 			fillRule="evenodd"
// 			d="M4.4 10.8h15.2v9.4H4.4zm7.6 1.9c-2 0-3.6 1.6-3.6 3.6v3.9h7.2v-3.9c0-2-1.6-3.6-3.6-3.6z"
// 			fill={color}
// 		/>
// 		<rect x="2.4" y="19.8" width="19.2" height="2" rx=".6" fill={color} />
// 	</svg>
// );

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

export const IconCrypt = ({
	size = 14,
	color = "var(--c-crypt)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M12 2.2l9.4 6.3v1.7H2.6V8.5z" fill={color} />
		<path
			fillRule="evenodd"
			d="M4.4 10.8h15.2v9.4H4.4zm7.6 1.9c-2 0-3.6 1.6-3.6 3.6v3.9h7.2v-3.9c0-2-1.6-3.6-3.6-3.6z"
			fill={color}
		/>
		<rect x="2.4" y="19.8" width="19.2" height="2" rx=".6" fill={color} />
	</svg>
);

export const IconReliquary = ({
	size = 14,
	color = "var(--c-reliquary)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			d="M2.8 10.6C2.8 7.2 6.9 4.4 12 4.4s9.2 2.8 9.2 6.2v1.1H2.8z"
			fill={color}
		/>
		<path
			fillRule="evenodd"
			d="M3.6 12.2h16.8v7.4H3.6zm8.4 1.7l2.2 2.1-2.2 2.1-2.2-2.1z"
			fill={color}
		/>
		<rect x="2.6" y="20.2" width="4.4" height="2" rx=".6" fill={color} />
		<rect x="17" y="20.2" width="4.4" height="2" rx=".6" fill={color} />
		<rect x="10.8" y="1.8" width="2.4" height="2.4" rx=".7" fill={color} />
	</svg>
);

export const IconRitual = ({
	size = 14,
	color = "var(--c-ritual)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path
			fillRule="evenodd"
			d="M12 1.8a10.2 10.2 0 1 0 0 20.4 10.2 10.2 0 1 0 0-20.4zm0 2.4a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 1 1 0-15.6z"
			fill={color}
		/>
		<path
			fillRule="evenodd"
			d="M12 19.3L4.9 6.5h14.2zm0-3.9l3.6-6.5H8.4z"
			fill={color}
		/>
		<circle cx="12" cy="10.8" r="1.5" fill={color} />
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
	color = "var(--ink-parchm)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M2.6 20.4c1.4-4.2 4.9-7 9.4-7s8 2.8 9.4 7z" fill={color} />
		<circle cx="7.2" cy="8.4" r="1.5" fill={color} />
		<circle cx="12.4" cy="4.4" r="1.9" fill={color} />
		<circle cx="17.2" cy="9.1" r="1.2" fill={color} />
		<circle cx="12.2" cy="9.9" r="1" fill={color} />
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
		<circle cx="6.4" cy="10.8" r="2.9" fill={color} />
		<path d="M7.4 16.4c0-2.6 2.4-4.6 5.6-4.6s5.6 2 5.6 4.6z" fill={color} />
		<rect x="2.4" y="16.2" width="19.2" height="2.6" rx="1" fill={color} />
		<rect x="4.6" y="18.8" width="2.4" height="2.6" fill={color} />
		<rect x="17" y="18.8" width="2.4" height="2.6" fill={color} />
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
