import type { Resources } from "../../../game/types";
import { costLines } from "../../cost";
import { formatNumber } from "../../format";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

export function CostBlock({
	cost,
	resources,
}: {
	cost: Partial<Resources>;
	resources: Resources;
}) {
	const lines = costLines(cost, resources);
	return (
		<div>
			<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
				Cost
			</div>
			<div className="border border-[color:var(--rule)] bg-bg-inset px-3.5">
				{lines.map((cl) => (
					<div
						key={cl.key}
						className={`flex items-center gap-2.5 py-2.5 border-b border-[color:var(--rule)] last:border-b-0 font-mono text-xs ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
					>
						<WorkshopRowIcon
							kind={cl.icon}
							size={18}
							color={cl.ok ? cl.color : "var(--hp-crit)"}
						/>
						<div className="flex-1 text-[11px] tracking-[0.1em]">
							{cl.label}
						</div>
						<div className="text-dim">
							{formatNumber(
								Math.floor(resources[cl.key as keyof Resources] as number),
							)}
						</div>
						<div className="text-right">/ {formatNumber(cl.amount)}</div>
					</div>
				))}
			</div>
		</div>
	);
}
