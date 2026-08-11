import type { IconProps } from "./IconProps";

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

export const IconBanner = ({
	size = 14,
	color = "var(--c-ember)",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<rect x="3.4" y="2.2" width="1.8" height="19.6" rx="0.9" fill={color} />
		<path d="M6.4 3.2h13.4l-3.1 4.9 3.1 4.9H6.4z" fill={color} />
		<circle cx="4.3" cy="1.6" r="1.4" fill={color} />
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
