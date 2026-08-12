import { NodeIcon } from "../icons";
import type { ResourceIconComponent } from "./cost";

/** Renders either a named `NodeIcon` kind or a resource icon component. */
export function WorkshopRowIcon({
	kind,
	size = 16,
	color = "currentColor",
}: {
	kind: string | ResourceIconComponent;
	size?: number;
	color?: string;
}) {
	if (typeof kind === "string") {
		return <NodeIcon kind={kind} size={size} color={color} />;
	}
	const IconComponent = kind;
	return <IconComponent size={size} color={color} />;
}
