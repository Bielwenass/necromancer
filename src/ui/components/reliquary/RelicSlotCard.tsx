import type { Relic } from "../../../game/types";
import { Button } from "../common/Button";
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
				<Button
					size="icon"
					variant="quiet"
					tone="muted"
					title="Unequip"
					onClick={(e) => {
						e.stopPropagation();
						onUnequip();
					}}
					className="absolute top-0.5 right-0.5 z-10 size-5 text-[10px]"
				>
					✕
				</Button>
			)}
		</div>
	);
}
