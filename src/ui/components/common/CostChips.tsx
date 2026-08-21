import type { Resources } from "../../../game/types";
import { costLines } from "../../cost";
import { formatNumber } from "../../format";

/** A cost as inline icon+amount chips; a resource short of the price reads crit. */
export function CostChips({
	cost,
	resources,
	size = 12,
}: {
	cost: Partial<Resources>;
	resources: Resources;
	size?: number;
}) {
	return (
		<>
			{costLines(cost, resources).map((line) => {
				const Icon = line.icon;
				return (
					<span
						key={line.key}
						className={`inline-flex items-center gap-1 ${line.ok ? "" : "text-hp-crit"}`}
					>
						<Icon size={size} color={line.ok ? line.color : "var(--hp-crit)"} />
						{formatNumber(line.amount)}
					</span>
				);
			})}
		</>
	);
}
