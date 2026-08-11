import type { Resources } from "../../../game/types";
import { formatNumber } from "../../theme";
import { costLines } from "./cost";
import { Icon } from "./Icon";

export function CostBlock({
	cost,
	res,
}: {
	cost: Partial<Resources>;
	res: Resources;
}) {
	const lines = costLines(cost, res);
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
						<Icon
							kind={cl.icon}
							size={18}
							color={cl.ok ? cl.color : "var(--hp-crit)"}
						/>
						<div className="flex-1 text-[11px] tracking-[0.1em]">
							{cl.label}
						</div>
						<div className="text-dim">
							{formatNumber(
								Math.floor(res[cl.key as keyof Resources] as number),
							)}
						</div>
						<div className="text-right">/ {formatNumber(cl.amount)}</div>
					</div>
				))}
			</div>
		</div>
	);
}
