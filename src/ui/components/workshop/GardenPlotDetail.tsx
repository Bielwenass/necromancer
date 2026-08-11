import { canAffordCost } from "../../../game/resources";
import type { Resources } from "../../../game/types";
import {
	GARDEN_BASE_YIELD,
	GARDEN_PLOT_NAMES,
	gardenCost,
} from "../../../game/workshopUpgrades";
import { BuyButton } from "./BuyButton";
import { CostBlock } from "./CostBlock";

export function GardenPlotDetail({
	idx,
	level,
	res,
	onBuy,
}: {
	idx: number;
	level: number;
	res: Resources;
	onBuy: (id: string) => void;
}) {
	const cost = gardenCost(level);
	const canBuy = canAffordCost(cost, res);
	const yieldNow = (GARDEN_BASE_YIELD * level).toFixed(2);
	const yieldNext = (GARDEN_BASE_YIELD * (level + 1)).toFixed(2);

	return (
		<div className="flex flex-col gap-[18px]">
			<div>
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim">
					Bone Garden Plot
				</div>
				<div className="font-display text-2xl tracking-wider text-bone mt-2">
					{GARDEN_PLOT_NAMES[idx]}
				</div>
				<div className="font-mono text-[10px] text-ember tracking-[0.2em] mt-2">
					LV {level}
				</div>
			</div>
			<div>
				<div className="font-display text-[10px] tracking-[0.24em] uppercase text-dim mb-2">
					Yield
				</div>
				<div className="flex items-baseline gap-3.5 py-2.5">
					<span className="font-display text-2xl text-bone">{yieldNow}/s</span>
					<span className="font-mono text-base text-dim">➞</span>
					<span className="font-display text-2xl text-ember">
						{yieldNext}/s
					</span>
				</div>
			</div>
			<CostBlock cost={cost} res={res} />
			<BuyButton
				label={
					level === 0
						? "Purchase Plot"
						: canBuy
							? `Upgrade to LV ${level + 1}`
							: "Insufficient"
				}
				disabled={!canBuy}
				onClick={() => onBuy(`garden.${idx}`)}
			/>
		</div>
	);
}
