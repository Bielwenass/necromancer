import type { ComponentType } from "react";

export interface IconProps {
	size?: number;
	color?: string;
}

export type IconComponent = ComponentType<IconProps>;
