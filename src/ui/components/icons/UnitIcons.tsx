import type { IconProps } from "./IconProps";

export const IconSkeleton = ({
	size = 14,
	color = "var(--c-skeleton)",
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
			d="M12 2.6c-4.6 0-8.2 3.4-8.2 7.7 0 2.6 1.3 4.8 3.4 6.2v4.9h9.6v-4.9c2.1-1.4 3.4-3.6 3.4-6.2 0-4.3-3.6-7.7-8.2-7.7zM8.9 8.7a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 1 1 0-4.2zm6.2 0a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 1 1 0-4.2zM12 13.9l1.3 2.4h-2.6zM10.4 17.9v3.5h-1.3v-3.5zm4.5 0v3.5h-1.3v-3.5z"
			fill={color}
		/>
	</svg>
);

export const IconZombie = ({
	size = 14,
	color = "var(--c-zombie)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<rect x="6.4" y="8.2" width="1.9" height="5.6" rx=".95" fill={color} />
		<rect x="9.1" y="5.2" width="1.9" height="8.6" rx=".95" fill={color} />
		<rect x="11.8" y="4.4" width="1.9" height="9.4" rx=".95" fill={color} />
		<rect x="14.5" y="6.6" width="1.9" height="7.2" rx=".95" fill={color} />
		<rect
			x="17.2"
			y="9"
			width="1.8"
			height="5"
			rx=".9"
			transform="rotate(20 18.1 11.5)"
			fill={color}
		/>
		<path
			d="M6 12.8h13v2.6a2.4 2.4 0 0 1-2.4 2.4H8.4A2.4 2.4 0 0 1 6 15.4z"
			fill={color}
		/>
		<rect x="2.4" y="18.4" width="19.2" height="2.4" rx="1" fill={color} />
	</svg>
);

export const IconWraith = ({
	size = 14,
	color = "var(--c-wraith)",
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
			d="M12 2.4c-4.1 0-7.2 3.2-7.2 7.3 0 3.6-.8 6.4-2.2 9.4 2.5-1.1 4.3-.7 5.4.6 1-1.7 2.4-2.5 4-2.5s3 .8 4 2.5c1.1-1.3 2.9-1.7 5.4-.6-1.4-3-2.2-5.8-2.2-9.4 0-4.1-3.1-7.3-7.2-7.3zM9.6 8.5c.9 0 1.5 1 1.5 2.2s-.6 2.2-1.5 2.2-1.5-1-1.5-2.2.6-2.2 1.5-2.2zm4.8 0c.9 0 1.5 1 1.5 2.2s-.6 2.2-1.5 2.2-1.5-1-1.5-2.2.6-2.2 1.5-2.2z"
			fill={color}
		/>
	</svg>
);
