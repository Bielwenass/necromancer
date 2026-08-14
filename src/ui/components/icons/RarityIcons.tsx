import type { IconProps } from "./IconProps";

export const IconRarityCommon = ({
	size = 16,
	color = "currentColor",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M12 5L19 12L12 19L5 12Z" fill={color} />
	</svg>
);

export const IconRarityUncommon = ({
	size = 16,
	color = "currentColor",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M12 5L15 8L12 11L9 8Z" fill={color} />
		<path d="M12 5L15 8L12 11L9 8Z" fill={color} transform="rotate(90 12 12)" />
		<path
			d="M12 5L15 8L12 11L9 8Z"
			fill={color}
			transform="rotate(180 12 12)"
		/>
		<path
			d="M12 5L15 8L12 11L9 8Z"
			fill={color}
			transform="rotate(270 12 12)"
		/>
		{/* <circle cx="12" cy="3" r="1.5" fill={color} />
		<circle cx="21" cy="12" r="1.5" fill={color} />
		<circle cx="12" cy="21" r="1.5" fill={color} />
		<circle cx="3" cy="12" r="1.5" fill={color} /> */}
	</svg>
);

export const IconRarityRare = ({
	size = 16,
	color = "currentColor",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M12 8L16 12L12 16L8 12Z" fill={color} />
		<path d="M12 1L13.4 6L10.6 6Z" fill={color} />
		<path d="M12 1L13.4 6L10.6 6Z" fill={color} transform="rotate(90 12 12)" />
		<path d="M12 1L13.4 6L10.6 6Z" fill={color} transform="rotate(180 12 12)" />
		<path d="M12 1L13.4 6L10.6 6Z" fill={color} transform="rotate(270 12 12)" />
	</svg>
);

export const IconRarityEpic = ({
	size = 16,
	color = "currentColor",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		{/* <path d="M12 7L17 12L12 17L7 12Z" fill={color} /> */}
		<circle cx="12" cy="12" r="3" fill={color} />
		<path
			fillRule="evenodd"
			d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 1 0 0-17.2zm0 1a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 1 1 0-15.2z"
			fill={color}
		/>
		<path d="M12 0L13.4 7L10.6 7Z" fill={color} />
		{/* <path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(45 12 12)" /> */}
		<path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(90 12 12)" />
		{/* <path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(135 12 12)" /> */}
		<path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(180 12 12)" />
		{/* <path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(225 12 12)" /> */}
		<path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(270 12 12)" />
		{/* <path d="M12 0L13.4 7L10.6 7Z" fill={color} transform="rotate(315 12 12)" /> */}
	</svg>
);

export const IconRarityLegendary = ({
	size = 16,
	color = "currentColor",
}: IconProps) => (
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
	>
		<path d="M12 6L18 12L12 18L6 12Z" fill={color} />
		<path
			fillRule="evenodd"
			d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 1 0 0-17.2zm0 1a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 1 1 0-15.2z"
			fill={color}
		/>
		<path d="M12 1L13.6 7L10.4 7Z" fill={color} />
		<path d="M12 1L13.6 7L10.4 7Z" fill={color} transform="rotate(90 12 12)" />
		<path d="M12 1L13.6 7L10.4 7Z" fill={color} transform="rotate(180 12 12)" />
		<path d="M12 1L13.6 7L10.4 7Z" fill={color} transform="rotate(270 12 12)" />
		<path d="M12 2L13.4 7L10.6 7Z" fill={color} transform="rotate(45 12 12)" />
		<path d="M12 2L13.4 7L10.6 7Z" fill={color} transform="rotate(135 12 12)" />
		<path d="M12 2L13.4 7L10.6 7Z" fill={color} transform="rotate(225 12 12)" />
		<path d="M12 2L13.4 7L10.6 7Z" fill={color} transform="rotate(315 12 12)" />
	</svg>
);
