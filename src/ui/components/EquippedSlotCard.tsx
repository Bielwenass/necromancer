import type { Relic, SlotId } from "../../game/types";
import { RelicCard } from "./RelicCard";

export function EquippedSlotCard({
	slotId,
	slotLabel,
	relic,
	selected,
	onSelect,
	onUnequip,
}: {
	slotId: SlotId;
	slotLabel: string;
	relic: Relic | null;
	selected: boolean;
	onSelect: () => void;
	onUnequip: () => void;
}) {
	void slotId;

	// An empty slot is display-only: relics are equipped from RelicDetail, so
	// there is nothing to click here.
	if (!relic) {
		return (
			<div className="w-[130px] aspect-[320/460] bg-bg-inset border border-dashed border-rule flex flex-col items-center justify-center relative">
				<div className="mono absolute top-2 left-[10px] text-xs text-dim tracking-[0.1em]">
					{slotLabel}
				</div>
				<div className="mono text-xs text-dim tracking-[0.14em] mt-[10px]">
					EMPTY
				</div>
			</div>
		);
	}

	return (
		<div className="w-[130px] relative">
			<RelicCard
				relic={relic}
				variant="inventory"
				selected={selected}
				onClick={onSelect}
			/>
			<div className="mono absolute top-[6px] left-2 text-[7px] text-dim tracking-[0.1em] z-10 pointer-events-none">
				{slotLabel}
			</div>
			{selected && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onUnequip();
					}}
					className="absolute top-1 right-[6px] mono text-[9px] text-muted z-10 bg-transparent border-0 cursor-pointer p-0"
				>
					✕
				</button>
			)}
		</div>
	);
}
