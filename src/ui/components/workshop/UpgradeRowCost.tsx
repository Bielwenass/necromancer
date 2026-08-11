import type { Resources } from "../../../game/types";
import { formatNumber } from "../../theme";
import { costLines } from "./cost";
import { Icon } from "./Icon";
import type { WRow } from "./types";

/** The right-hand price column of an `UpgradeRow`. */
export function UpgradeRowCost({
	row,
	res,
	maxed,
}: {
	row: WRow;
	res: Resources;
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
			{costLines(cost, res).map((cl) => (
				<div
					key={cl.key}
					className={`flex items-center gap-1.5 justify-end font-mono text-[11px] ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
				>
					<Icon
						kind={cl.icon}
						size={12}
						color={cl.ok ? cl.color : "var(--hp-crit)"}
					/>
					<span>{formatNumber(cl.amount)}</span>
				</div>
			))}
		</>
	);
}
