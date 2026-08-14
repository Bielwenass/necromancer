import { RELIC_BASES, SLOT_LABELS } from "../../../game/data/relics";
import { dustValue } from "../../../game/rules/relics";
import type { Relic, SlotId } from "../../../game/types";
import { rarityColor } from "../../theme";
import { ConfirmAction } from "../common/ConfirmAction";
import { Meter } from "../common/Meter";
import { StatRow } from "../common/StatRow";
import { RelicCard } from "./RelicCard";

export function RelicDetail({
	relic,
	unlockedSlots,
	onEquip,
	confirmSacrifice,
	onRequestSacrifice,
	onConfirmSacrifice,
	onCancelSacrifice,
}: {
	relic: Relic;
	unlockedSlots: SlotId[];
	onEquip: (slotId: SlotId) => void;
	confirmSacrifice: boolean;
	onRequestSacrifice: () => void;
	onConfirmSacrifice: () => void;
	onCancelSacrifice: () => void;
}) {
	const c = rarityColor(relic.rarity);
	const base = RELIC_BASES.find((b) => b.id === relic.baseId);
	const dust = dustValue([relic]);

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
					onRequest={onRequestSacrifice}
					onConfirm={onConfirmSacrifice}
					onCancel={onCancelSacrifice}
					label={`Sacrifice (+${dust} dust)`}
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
						{base.slotIds.map((slotId) => {
							// A sealed slot still shows, so the tree makes visible sense.
							const locked = !unlockedSlots.includes(slotId);
							return (
								<button
									type="button"
									key={slotId}
									disabled={locked}
									onClick={() => onEquip(slotId)}
									title={locked ? "Sealed — open it in the upgrade tree" : ""}
									className={`px-[10px] py-1 border mono text-sm tracking-wide ${
										locked
											? "border-rule text-dim opacity-50 cursor-not-allowed"
											: "border-rule-strong text-muted"
									}`}
								>
									{SLOT_LABELS[slotId]}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
