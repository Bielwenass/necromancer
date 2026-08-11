import type { Relic } from "../../game/types";
import { RelicCard } from "../components/RelicCard";

export function InvCard({
	relic,
	selected,
	onSelect,
}: {
	relic: Relic;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<div className="w-[124px] relative">
			<RelicCard
				relic={relic}
				variant="inventory"
				selected={selected}
				onClick={onSelect}
			/>
			{relic.isNew && (
				<div className="mono absolute top-2 right-2 text-[8px] text-coin tracking-[0.1em] z-10 pointer-events-none">
					NEW
				</div>
			)}
			{relic.duplicateCount > 0 && !relic.isNew && (
				<div className="mono absolute top-2 right-2 text-[8px] text-muted tracking-[0.1em] z-10 pointer-events-none">
					×{relic.duplicateCount + 1}
				</div>
			)}
		</div>
	);
}
