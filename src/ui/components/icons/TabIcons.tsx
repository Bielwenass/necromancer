import type { IconProps } from "./IconProps";

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

export const IconUpgrades = ({
	size = 14,
	color = "var(--c-upgrades)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M12 2.6l8.4 8.6h-4.7L12 7.4l-3.7 3.8H3.6z" fill={color} />
		<path d="M12 12.2l8.4 8.6h-4.7L12 17l-3.7 3.8H3.6z" fill={color} />
	</svg>
);
