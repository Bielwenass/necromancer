import { canAffordCost } from "../../../game/resources";
import type { Resources } from "../../../game/types";
import { BuyButton } from "./BuyButton";
import { CostBlock } from "./CostBlock";
import { PointsCostBlock } from "./PointsCostBlock";
import type { WRow } from "./types";
import { UpgradeDetailLocked } from "./UpgradeDetailLocked";

export function UpgradeDetail({
	row,
	res,
	pts,
	onBuy,
	onSkillBuy,
	canPurchaseSkill,
}: {
	row: WRow;
	res: Resources;
	pts: number;
	onBuy: (id: string) => void;
	onSkillBuy: (id: string) => void;
	canPurchaseSkill: (upgradeId: string) => boolean;
}) {
	if (row.locked) return <UpgradeDetailLocked row={row} />;

	const skill = row.skill;
	const maxed = row.maxLevel !== undefined && row.level >= row.maxLevel;
	const cost = maxed || skill ? null : row.costFn(row.level);
	const canBuy = maxed
		? false
		: skill
			? canPurchaseSkill(skill.upgradeId)
			: cost
				? canAffordCost(cost, res)
				: false;
	const valueNumerical = Math.round(Number(row.valueFn(row.level)) * 100) / 100;
	const valueNextNumerical =
		Math.round(Number(row.nextFn(row.level)) * 100) / 100;

	return (
		<div className="flex flex-col gap-[18px]">
			<div>
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
					{skill ? "One-time Upgrade" : "Leveled Upgrade"}
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
					{skill ? (
						<PointsCostBlock skillCost={skill.cost} pts={pts} />
					) : (
						cost && <CostBlock cost={cost} res={res} />
					)}
					<BuyButton
						label={
							canBuy
								? skill
									? "Inscribe"
									: `Upgrade ➞ LV ${row.level + 1}`
								: "Insufficient"
						}
						disabled={!canBuy}
						onClick={() =>
							skill ? onSkillBuy(skill.upgradeId) : onBuy(row.id)
						}
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
