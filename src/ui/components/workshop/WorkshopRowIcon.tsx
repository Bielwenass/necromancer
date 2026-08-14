import { NodeIcon } from "../icons";
import type { IconComponent } from "../icons/IconProps";

export function WorkshopRowIcon({
	kind,
	size = 16,
	color = "currentColor",
}: {
	kind: string | IconComponent;
	size?: number;
	color?: string;
}) {
	if (typeof kind === "string") {
		return <NodeIcon kind={kind} size={size} color={color} />;
	}
	const IconComponent = kind;
	return <IconComponent size={size} color={color} />;
}
