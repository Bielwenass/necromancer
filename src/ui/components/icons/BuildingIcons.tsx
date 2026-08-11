// Unused
import type { IconProps } from "./IconProps";

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
