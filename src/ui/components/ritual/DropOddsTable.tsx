import type { Rarity } from "../../../game/types";
import { rarityColor, rarityName } from "../../theme";
import { SectionLabel } from "../common/SectionLabel";

interface DropOddsTableProps {
	/** Normalised percentages from `poolOdds()`; never raw pool weights. */
	odds: { rarity: Rarity; pct: number }[];
}

export function DropOddsTable({ odds }: DropOddsTableProps) {
	return (
		<div className="mt-5">
			<SectionLabel className="text-xs text-parchm tracking-[0.22em] flex justify-between mb-2">
				Relic Odds
			</SectionLabel>

			<div className="flex h-1.5 mb-2">
				{odds.map((o) => (
					<div
						key={o.rarity}
						className="opacity-[0.85]"
						style={{ width: `${o.pct}%`, background: rarityColor(o.rarity) }}
					/>
				))}
			</div>

			{odds.map((o, i) => (
				<div
					key={o.rarity}
					className={`flex items-baseline py-[3px] ${
						i < odds.length - 1 ? "border-b border-rule" : ""
					}`}
				>
					<span
						className="w-2 h-2 mr-2 inline-block"
						style={{ background: rarityColor(o.rarity) }}
					/>
					<span
						className="mono text-[11px] tracking-[0.12em] uppercase"
						style={{ color: rarityColor(o.rarity) }}
					>
						{rarityName(o.rarity)}
					</span>
					<span className="mono text-[11px] text-bone ml-auto">
						{o.pct.toFixed(1)}
						<span className="text-dim">%</span>
					</span>
				</div>
			))}
		</div>
	);
}
