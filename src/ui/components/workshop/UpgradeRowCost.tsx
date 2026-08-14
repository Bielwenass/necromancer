import type { Resources } from "../../../game/types";
import { formatNumber } from "../../format";
import { costLines } from "./cost";
import type { WorkshopRow } from "./types";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

export function UpgradeRowCost({
	row,
	resources,
	maxed,
}: {
	row: WorkshopRow;
	resources: Resources;
	maxed: boolean;
}) {
	if (maxed)
		return (
			<div className="font-mono text-[9px] tracking-[0.12em] text-hp-good">
				MAXED
			</div>
		);

	const cost = row.costFn(row.level);
	if (!cost) return null;

	return (
		<>
			{costLines(cost, resources).map((cl) => (
				<div
					key={cl.key}
					className={`flex items-center gap-1.5 justify-end font-mono text-xs ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
				>
					<WorkshopRowIcon
						kind={cl.icon}
						size={14}
						color={cl.ok ? cl.color : "var(--hp-crit)"}
					/>
					<span>{formatNumber(cl.amount)}</span>
				</div>
			))}
		</>
	);
}
