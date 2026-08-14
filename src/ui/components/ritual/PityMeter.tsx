import type { Rarity } from "../../../game/types";
import { rarityColor, rarityName } from "../../theme";
import { Meter } from "../common/Meter";
import { StatRow } from "../common/StatRow";

interface PityMeterProps {
	counter: number;
	max: number;
	guaranteed: Rarity;
}

export function PityMeter({ counter, max, guaranteed }: PityMeterProps) {
	const color = rarityColor(guaranteed);

	return (
		<div className="mt-[18px] py-3 px-3.5 border border-[color:var(--rule-strong)] bg-bg-inset">
			<StatRow
				label="PITY COUNTER"
				value={
					<>
						{counter}
						<span className="text-dim">/{max}</span>
					</>
				}
				labelClassName="font-mono text-[9px] text-dim tracking-[0.16em]"
				valueClassName="font-mono text-[11px] text-bone"
				className="mb-1.5"
			/>

			<Meter
				value={counter / max}
				color={color}
				borderClassName="border-[color:var(--rule)]"
			/>

			<div className="mt-1.5">
				<span className="font-mono text-[10px] text-parchm">
					{max - counter} to guaranteed{" "}
				</span>
				<span
					className="font-mono text-[10px] tracking-[0.14em] uppercase"
					style={{ color }}
				>
					{rarityName(guaranteed)}
				</span>
			</div>
		</div>
	);
}
