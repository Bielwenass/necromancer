import type { Relic } from "../../../game/types";
import { RelicCard } from "./RelicCard";

export function RelicSlotCard({
	slotLabel,
	relic,
	locked,
	selected,
	onSelect,
	onUnequip,
}: {
	slotLabel: string;
	relic: Relic | null;
	locked: boolean;
	selected: boolean;
	onSelect: () => void;
	onUnequip: () => void;
}) {
	if (locked || !relic) {
		return (
			<div className="w-[130px] aspect-[320/460] bg-bg-inset border border-dashed border-rule flex flex-col items-center justify-center relative max-md:w-[104px]">
				<div className="mono absolute top-2 left-[10px] text-xs text-dim tracking-[0.1em]">
					{slotLabel}
				</div>
				<div className="mono text-xs text-dim tracking-[0.14em] mt-[10px]">
					{locked ? "SEALED" : "EMPTY"}
				</div>
			</div>
		);
	}

	return (
		<div className="w-[130px] relative max-md:w-[104px]">
			<RelicCard
				relic={relic}
				variant="inventory"
				selected={selected}
				onClick={onSelect}
			/>
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
