import { RELIC_BASES } from "../../game/data/relics";
import { DUST_VALUES } from "../../game/relics";
import type { Relic, SlotId } from "../../game/types";
import { RelicCard } from "../components/RelicCard";
import { rarityColor } from "../theme";

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
		<div className="px-4 py-[14px] flex flex-col h-full">
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
			<div className="mt-[14px]">
				<div className="flex justify-between">
					<span className="mono text-[9px] text-muted tracking-[0.14em]">
						QUALITY
					</span>
					<span className="mono text-xs" style={{ color: c }}>
						{relic.quality}
						<span className="text-dim">/100</span>
					</span>
				</div>
				<div
					className="bg-bg-inset border border-rule relative overflow-hidden mt-1"
					style={{ height: 5 }}
				>
					<i
						className="block h-full"
						style={{ width: `${relic.quality}%`, background: c }}
					/>
				</div>
			</div>

			{/* Fusion progress */}
			<div className="mt-3">
				<div className="flex justify-between mb-[6px]">
					<span className="mono text-[9px] text-dim tracking-[0.14em]">
						FUSION PROGRESS
					</span>
					<span className="mono text-[9px] text-muted">
						{relic.duplicateCount}/5 DUPES
					</span>
				</div>
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
				{!confirmSacrifice ? (
					<button
						type="button"
						onClick={onSacrifice}
						className="flex-1 py-[10px] border border-rule-strong display text-xs tracking-[0.22em] uppercase text-parchm"
					>
						Sacrifice (+{dustValue} dust)
					</button>
				) : (
					<>
						<button
							type="button"
							onClick={onCancelSacrifice}
							className="flex-1 py-[10px] border border-rule-strong display text-xs tracking-[0.22em] uppercase text-muted"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onSacrifice}
							className="flex-1 py-[10px] border border-hp-crit display text-xs tracking-[0.22em] uppercase text-hp-crit bg-[rgba(196,90,62,0.08)]"
						>
							Confirm
						</button>
					</>
				)}
			</div>

			{/* Equip slots */}
			{base && (
				<div className="mt-2">
					<div className="mono text-[9px] text-dim tracking-[0.14em] mb-1">
						EQUIP TO SLOT
					</div>
					<div className="flex gap-1 flex-wrap">
						{base.slotIds.map((slotId) => (
							<button
								type="button"
								key={slotId}
								onClick={() => onEquip(slotId)}
								className="px-[10px] py-1 border border-rule-strong mono text-[10px] tracking-[0.1em] text-muted"
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
