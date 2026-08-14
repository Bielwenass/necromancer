/** Keyed by `UpgradeNode.icon`, plus the handful the Workshop sections name. */
const NODE_ICONS: Record<string, (color: string) => React.ReactElement> = {
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
		<path d="M0 -6 Q 4 -4 4 0 Q 4 4 0 6 Q -4 4 -4 0 Q -4 -4 0 -6 Z" fill={c} />
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
