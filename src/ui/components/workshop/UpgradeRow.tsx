import { canAffordCost } from "../../../game/rules/resources";
import type { Resources } from "../../../game/types";
import { isRowMaxed } from "./sections";
import type { WorkshopRow } from "./types";
import { UpgradeRowCost } from "./UpgradeRowCost";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

export function UpgradeRow({
	row,
	resources,
	pinned,
	onPin,
	onBuy,
}: {
	row: WorkshopRow;
	resources: Resources;
	pinned: boolean;
	onPin: (id: string) => void;
	onBuy: (row: WorkshopRow) => void;
}) {
	const maxed = isRowMaxed(row);
	const cost = maxed ? null : row.costFn(row.level);
	const affordable = cost ? canAffordCost(cost, resources) : false;
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
				<WorkshopRowIcon
					kind={row.icon}
					size={26}
					color={maxed ? "var(--hp-good)" : "var(--c-bone)"}
				/>
			</div>
			<div>
				<div className="font-display text-md tracking-wider text-bone">
					{row.name}
				</div>
				<div className="text-sm text-muted mt-[3px] leading-snug">
					{row.description}
				</div>
			</div>
			<div className="text-right">
				<div
					className={`font-mono text-xs tracking-widest ${maxed ? "text-hp-good" : "text-ember"}`}
				>
					{maxed ? "DONE" : `LV ${row.level}`}
				</div>
				<div className="font-mono text-sm text-parchm mt-0.5">
					{valueNumerical ? valueNumerical : row.valueFn(row.level)}
				</div>
			</div>
			<div className="text-right">
				<UpgradeRowCost row={row} resources={resources} maxed={maxed} />
			</div>
		</button>
	);
}
