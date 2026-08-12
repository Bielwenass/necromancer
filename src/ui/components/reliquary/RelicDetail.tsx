import { RELIC_BASES } from "../../../game/data/relics";
import { DUST_VALUES } from "../../../game/rules/relics";
import type { Relic, SlotId } from "../../../game/types";
import { rarityColor } from "../../theme";
import { ConfirmAction } from "../common/ConfirmAction";
import { Meter } from "../common/Meter";
import { StatRow } from "../common/StatRow";
import { RelicCard } from "./RelicCard";

export function RelicDetail({
	relic,
	onSacrifice,
	onEquip,
	confirmSacrifice,
	onCancelSacrifice,
}: {
	relic: Relic;
	onSacrifice: () => void;
	onEquip: (slotId: SlotId) => void;
	confirmSacrifice: boolean;
	onCancelSacrifice: () => void;
}) {
	const c = rarityColor(relic.rarity);
	const base = RELIC_BASES.find((b) => b.id === relic.baseId);
	const dustValue = DUST_VALUES[relic.rarity];

	return (
		<div className="px-4 py-5 flex flex-col h-full">
			{/* Card preview */}
			<div className="flex justify-center">
				<div className="w-[300px]">
					<RelicCard
						relic={relic}
						variant="pull"
						tweaks={{ idleDrift: true, tilt: 6 }}
					/>
				</div>
			</div>

			{/* Quality */}
			<div className="mt-8">
				<StatRow
					label="QUALITY"
					value={
						<>
							{relic.quality}
							<span className="text-muted">/100</span>
						</>
					}
					valueClassName="mono text-xs"
					valueStyle={{ color: c }}
				/>
				<Meter value={relic.quality / 100} color={c} className="mt-1 h-[5px]" />
			</div>

			{/* Fusion progress */}
			<div className="mt-3">
				<StatRow
					label="FUSION PROGRESS"
					value={`${relic.duplicateCount}/5`}
					valueClassName="mono text-xs text-muted"
					className="mb-[6px]"
				/>
				<div className="flex gap-1">
					{[1, 2, 3, 4, 5].map((pip) => {
						const filled = pip <= relic.duplicateCount;
						return (
							<div
								key={pip}
								className="flex-1 h-[10px] border"
								style={{
									background: filled ? c : "var(--bg-inset)",
									borderColor: filled ? c : "var(--rule)",
									opacity: filled ? 1 : 0.4,
								}}
							/>
						);
					})}
				</div>
			</div>

			{/* Action buttons */}
			<div className="mt-auto flex gap-2 pt-4">
				<ConfirmAction
					confirming={confirmSacrifice}
					onRequest={onSacrifice}
					onConfirm={onSacrifice}
					onCancel={onCancelSacrifice}
					label={`Sacrifice (+${dustValue} dust)`}
					buttonClassName="flex-1 py-[10px] display text-xs tracking-[0.22em] uppercase"
				/>
			</div>

			{/* Equip slots */}
			{base && (
				<div className="mt-6">
					<div className="mono text-xs text-dim tracking-wider mb-2">
						EQUIP TO SLOT
					</div>
					<div className="flex gap-1.5 flex-wrap">
						{base.slotIds.map((slotId) => (
							<button
								type="button"
								key={slotId}
								onClick={() => onEquip(slotId)}
								className="px-[10px] py-1 border border-rule-strong mono text-sm tracking-wide text-muted"
							>
								{slotId}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
