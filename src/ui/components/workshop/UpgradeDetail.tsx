import { canAffordCost } from "../../../game/resources";
import type { Resources } from "../../../game/types";
import { BuyButton } from "./BuyButton";
import { CostBlock } from "./CostBlock";
import { isRowMaxed } from "./sections";
import type { WRow } from "./types";

export function UpgradeDetail({
	row,
	res,
	onBuy,
}: {
	row: WRow;
	res: Resources;
	onBuy: (row: WRow) => void;
}) {
	const maxed = isRowMaxed(row);
	const cost = maxed ? null : row.costFn(row.level);
	// Prerequisites don't need checking here: `skillRows` omits nodes whose
	// prerequisites are unmet, so a visible unmaxed row is always eligible, and
	// `purchaseUpgrade` re-checks anyway.
	const canBuy = cost ? canAffordCost(cost, res) : false;
	const valueNumerical = Math.round(Number(row.valueFn(row.level)) * 100) / 100;
	const valueNextNumerical =
		Math.round(Number(row.nextFn(row.level)) * 100) / 100;

	return (
		<div className="flex flex-col gap-[18px]">
			<div>
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
					{row.kindLabel ?? "Leveled Upgrade"}
				</div>
				<div className="font-display text-2xl text-bone tracking-wider mt-2 leading-tight">
					{row.name}
				</div>
				<div
					className={`font-mono text-[10px] tracking-[0.2em] mt-2 ${maxed ? "text-hp-good" : "text-ember"}`}
				>
					{maxed ? "INSCRIBED" : `LV ${row.level}`}
				</div>
			</div>
			<div className="p-4 border border-[color:var(--rule)] bg-bg-inset font-body text-sm text-parchm leading-relaxed">
				{row.description}
			</div>
			{row.flavor && (
				<div className="font-body italic text-sm text-muted leading-normal">
					"{row.flavor}"
				</div>
			)}
			{!maxed && (
				<>
					<div>
						<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
							Current ➞ Next
						</div>
						<div className="flex items-baseline gap-3.5 py-2.5">
							<span className="font-display text-2xl text-bone">
								{valueNumerical ? valueNumerical : row.valueFn(row.level)}
							</span>
							<span className="font-mono text-base text-dim">➞</span>
							<span className="font-display text-2xl text-ember">
								{valueNextNumerical
									? valueNextNumerical
									: row.nextFn(row.level)}
							</span>
						</div>
					</div>
					{cost && <CostBlock cost={cost} res={res} />}
					<BuyButton
						label={
							canBuy
								? (row.buyLabel?.(row.level) ?? `Upgrade ➞ LV ${row.level + 1}`)
								: "Insufficient"
						}
						disabled={!canBuy}
						onClick={() => onBuy(row)}
					/>
				</>
			)}
			{maxed && (
				<div className="p-3.5 border border-hp-good bg-[rgba(111,169,98,0.06)] text-center">
					<div className="font-mono text-[10px] text-hp-good tracking-[0.16em]">
						INSCRIBED · ACTIVE
					</div>
				</div>
			)}
		</div>
	);
}
