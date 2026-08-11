interface IconProps {
	size?: number;
	color?: string;
}

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
