import { canAffordCost } from "../../../game/resources";
import type { Resources } from "../../../game/types";
import { Icon } from "./Icon";
import type { WRow } from "./types";
import { UpgradeRowCost } from "./UpgradeRowCost";
import { UpgradeRowLocked } from "./UpgradeRowLocked";

export function UpgradeRow({
	row,
	res,
	pts,
	focused,
	onFocus,
	onBuy,
}: {
	row: WRow;
	res: Resources;
	pts: number;
	focused: boolean;
	onFocus: (id: string) => void;
	onBuy: (id: string) => void;
}) {
	if (row.locked) return <UpgradeRowLocked row={row} />;

	const maxed = row.maxLevel !== undefined && row.level >= row.maxLevel;
	const cost = maxed || row.skill ? null : row.costFn(row.level);
	const affordable = maxed
		? false
		: row.skill
			? pts >= row.skill.cost
			: cost
				? canAffordCost(cost, res)
				: false;
	const valueNumerical = Math.round(Number(row.valueFn(row.level)) * 100) / 100;

	return (
		<button
			type="button"
			className={`grid grid-cols-[48px_1fr_90px_90px] items-center gap-4 py-4 w-full text-left transition-colors duration-100 border-b border-[color:var(--rule)] ${
				focused
					? "bg-bg-hover border-l-2 border-l-ember pl-[30px] pr-8"
					: "px-8 hover:bg-bg-hover"
			}`}
			onMouseEnter={() => onFocus(row.id)}
			onClick={() => onFocus(row.id)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (!maxed && affordable) onBuy(row.id);
			}}
		>
			<div className="flex items-center justify-center">
				<Icon
					kind={row.icon}
					size={26}
					color={maxed ? "var(--hp-good)" : "var(--c-bone)"}
				/>
			</div>
			<div>
				<div className="font-display text-sm tracking-[0.12em] text-bone">
					{row.name}
				</div>
				<div className="text-xs text-muted mt-[3px] leading-snug">
					{row.description}
				</div>
			</div>
			<div className="text-right">
				<div
					className={`font-mono text-[10px] tracking-[0.16em] ${maxed ? "text-hp-good" : "text-ember"}`}
				>
					{maxed ? "DONE" : `LV ${row.level}`}
				</div>
				<div className="font-mono text-[11px] text-parchm mt-0.5">
					{valueNumerical ? valueNumerical : row.valueFn(row.level)}
				</div>
			</div>
			<div className="text-right">
				<UpgradeRowCost
					row={row}
					res={res}
					maxed={maxed}
					affordable={affordable}
				/>
			</div>
		</button>
	);
}
