import type { Resources } from "../../../game/types";
import type { WorkshopRow } from "./types";
import { UpgradeDetail } from "./UpgradeDetail";

/** Right column: the pinned row in full, plus the interaction legend. */
export function UpgradeDetailPanel({
	row,
	resources,
	onBuy,
}: {
	row: WorkshopRow | null;
	resources: Resources;
	onBuy: (row: WorkshopRow) => void;
}) {
	return (
		<div className="w-[360px] min-w-[360px] border-l border-[color:var(--rule)] bg-bg-panel px-5 py-6 overflow-y-auto flex flex-col gap-5">
			{row ? (
				<UpgradeDetail row={row} resources={resources} onBuy={onBuy} />
			) : (
				<div className="font-mono text-[10px] text-dim tracking-[0.14em] text-center mt-10">
					SELECT A ROW TO SEE DETAILS
				</div>
			)}
			<div className="mt-auto p-3.5 border border-[color:var(--rule)] bg-bg-inset">
				<div className="font-mono text-[10px] text-dim tracking-[0.14em] leading-relaxed">
					CLICK A ROW TO SELECT IT.
					<br />↑ / ↓ MOVE · ENTER BUYS.
					<br />
					RIGHT-CLICK TO BUY INSTANTLY.
				</div>
			</div>
		</div>
	);
}
