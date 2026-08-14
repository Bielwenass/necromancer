import type React from "react";
import { formatNumber } from "../../format";
import type { IconComponent } from "../icons/IconProps";

interface ResourceReadoutProps {
	label: string;
	value: number;
	Icon: IconComponent;
	note?: React.ReactNode;
}

export function ResourceReadout({
	label,
	value,
	Icon,
	note,
}: ResourceReadoutProps) {
	return (
		<div className="flex items-center gap-2 font-mono text-sm max-md:shrink-0 max-md:gap-1 max-md:text-xs">
			<Icon size={20} />
			<div>
				<div className="text-muted text-[10px] tracking-[0.12em] uppercase">
					{label}
				</div>
				<div className="text-bone">
					{formatNumber(value)}{" "}
					{note ? <span className="text-[10px] text-muted">{note}</span> : null}
				</div>
			</div>
		</div>
	);
}
