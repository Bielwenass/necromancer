import type { ComponentType } from "react";

export interface IconProps {
	size?: number;
	color?: string;
}

/** An icon component, as every table of icons in the UI types it. */
export type IconComponent = ComponentType<IconProps>;
