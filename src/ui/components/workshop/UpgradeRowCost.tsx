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
	affordable,
}: {
	row: WRow;
	res: Resources;
	maxed: boolean;
	affordable: boolean;
}) {
	if (maxed)
		return (
			<div className="font-mono text-[9px] tracking-[0.12em] text-hp-good">
				MAXED
			</div>
		);

	if (row.skill)
		return (
			<>
				<div className="font-mono text-[9px] tracking-[0.14em] text-dim mb-1">
					Points
				</div>
				<div
					className={`flex items-center gap-1.5 justify-end font-mono text-[11px] ${affordable ? "text-parchm" : "text-hp-crit"}`}
				>
					<Icon
						kind="triple"
						size={12}
						color={affordable ? "var(--c-coin)" : "var(--hp-crit)"}
					/>
					<span>{row.skill.cost}</span>
				</div>
			</>
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
