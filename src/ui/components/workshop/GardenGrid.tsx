import type { Resources } from "../../../game/types";
import { GARDEN_PLOT_NAMES } from "../../../game/workshopUpgrades";
import { GardenPlotCard } from "./GardenPlotCard";
import { gardenTotalYield } from "./sections";

export function GardenGrid({
	levels,
	res,
	focusedId,
	onFocus,
	onBuy,
}: {
	levels: number[];
	res: Resources;
	focusedId: string | null;
	onFocus: (id: string) => void;
	onBuy: (id: string) => void;
}) {
	return (
		<>
			<div className="py-2.5 px-8 border-b border-[color:var(--rule)] flex items-center gap-4 shrink-0 min-h-[44px]">
				<div className="font-mono text-[10px] tracking-[0.16em] text-dim whitespace-nowrap">
					Garden Yield
				</div>
				<div className="font-mono text-sm text-bone">
					{gardenTotalYield(levels)}{" "}
					<span className="text-[10px] text-dim">BONES/SEC</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-3.5 py-5 px-8">
				{levels.map((lv, i) => (
					<GardenPlotCard
						key={GARDEN_PLOT_NAMES[i]}
						idx={i}
						level={lv}
						res={res}
						focused={focusedId === `garden.${i}`}
						onFocus={onFocus}
						onBuy={onBuy}
					/>
				))}
			</div>
		</>
	);
}
