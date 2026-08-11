import { canAffordCost } from "../../../game/resources";
import type { Resources } from "../../../game/types";
import { Icon } from "./Icon";
import { isRowMaxed } from "./sections";
import type { WRow } from "./types";
import { UpgradeRowCost } from "./UpgradeRowCost";

export function UpgradeRow({
	row,
	res,
	pts,
	pinned,
	onPin,
	onBuy,
}: {
	row: WRow;
	res: Resources;
	pts: number;
	pinned: boolean;
	onPin: (id: string) => void;
	onBuy: (row: WRow) => void;
}) {
	const maxed = isRowMaxed(row);
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
			id={`wrow-${row.id}`}
			className={`grid grid-cols-[48px_1fr_90px_90px] items-center gap-4 py-4 w-full text-left transition-colors duration-100 border-b border-[color:var(--rule)] ${
				pinned
					? "bg-bg-hover border-l-2 border-l-ember pl-[30px] pr-8"
					: "px-8 hover:bg-bg-hover"
			}`}
			onClick={() => onPin(row.id)}
			onContextMenu={(e) => {
				e.preventDefault();
				onPin(row.id);
				if (!maxed && affordable) onBuy(row);
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
