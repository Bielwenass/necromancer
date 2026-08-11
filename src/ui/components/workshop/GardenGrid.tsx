import type { GardenPlotId, Resources } from "../../../game/types";
import { GARDEN_PLOTS, gardenTotalYield } from "../../../game/workshopUpgrades";
import { GardenPlotCard } from "./GardenPlotCard";

export function GardenGrid({
	levels,
	res,
	focusedId,
	onFocus,
	onBuy,
}: {
	levels: Record<GardenPlotId, number>;
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
					{gardenTotalYield(levels).toFixed(2)}{" "}
					<span className="text-[10px] text-dim">BONES/SEC</span>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-3.5 py-5 px-8">
				{GARDEN_PLOTS.map((plot) => (
					<GardenPlotCard
						key={plot.id}
						plot={plot}
						level={levels[plot.id]}
						res={res}
						focused={focusedId === `garden.${plot.id}`}
						onFocus={onFocus}
						onBuy={onBuy}
					/>
				))}
			</div>
		</>
	);
}
