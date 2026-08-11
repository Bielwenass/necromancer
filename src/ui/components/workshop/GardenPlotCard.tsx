import { canAffordCost } from "../../../game/resources";
import type { Resources } from "../../../game/types";
import {
	GARDEN_BASE_YIELD,
	GARDEN_PLOT_NAMES,
	gardenCost,
} from "../../../game/workshopUpgrades";
import { costLines } from "./cost";
import { Icon } from "./Icon";

export function GardenPlotCard({
	idx,
	level,
	res,
	focused,
	onFocus,
	onBuy,
}: {
	idx: number;
	level: number;
	res: Resources;
	focused: boolean;
	onFocus: (id: string) => void;
	onBuy: (id: string) => void;
}) {
	const id = `garden.${idx}`;
	const cost = gardenCost(level);
	const canBuy = canAffordCost(cost, res);
	const yieldNow = (GARDEN_BASE_YIELD * level).toFixed(2);
	const costEntry = costLines(cost, res);
	return (
		<button
			type="button"
			className={`border bg-bg-panel-2 p-3.5 cursor-pointer transition-colors duration-[120ms] flex flex-col gap-2.5 text-left w-full ${
				focused
					? "border-ember"
					: "border-[color:var(--rule)] hover:border-ember"
			}`}
			onMouseEnter={() => onFocus(id)}
			onClick={() => onFocus(id)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (canBuy) onBuy(id);
			}}
		>
			<div className="flex items-center gap-2">
				<div
					className={`w-[7px] h-[7px] rounded-full shrink-0 ${canBuy ? "bg-ember" : "bg-dim"}`}
				/>
				<div className="font-display text-[11px] tracking-[0.16em] uppercase text-parchm">
					{GARDEN_PLOT_NAMES[idx]}
				</div>
			</div>
			<div className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 items-baseline">
				<div className="font-mono text-[9px] tracking-[0.14em] text-dim uppercase">
					YIELD
				</div>
				<div className="font-mono text-xs text-parchm">{yieldNow}/s</div>
				<div className="font-mono text-[9px] tracking-[0.14em] text-dim uppercase">
					LEVEL
				</div>
				<div className="font-mono text-xs text-parchm">LV {level}</div>
			</div>
			<div className="flex flex-col gap-[3px] mt-0.5 border-t border-[color:var(--rule)] pt-2">
				{level === 0 && (
					<div className="font-mono text-[9px] text-dim tracking-[0.12em] mb-1">
						PURCHASE
					</div>
				)}
				{costEntry.map((cl) => (
					<div
						key={cl.key}
						className={`flex items-center gap-[5px] font-mono text-[10px] ${cl.ok ? "text-parchm" : "text-hp-crit"}`}
					>
						<Icon
							kind={cl.icon}
							size={11}
							color={cl.ok ? cl.color : "var(--hp-crit)"}
						/>
						<span>{cl.amount.toLocaleString()}</span>
					</div>
				))}
			</div>
		</button>
	);
}
