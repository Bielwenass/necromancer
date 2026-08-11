import type { GardenPlotId, Resources } from "../../../game/types";
import { GARDEN_PLOTS } from "../../../game/workshopUpgrades";
import { GardenPlotDetail } from "./GardenPlotDetail";
import type { WRow, WSection } from "./types";
import { UpgradeDetail } from "./UpgradeDetail";

function findRow(sections: WSection[], rowId: string): WRow | null {
	for (const s of sections) {
		const found = s.rows?.find((r) => r.id === rowId);
		if (found) return found;
	}
	return null;
}

/** Right column: resolves the focused id to the matching detail body. */
export function DetailPanel({
	rowId,
	sections,
	res,
	pts,
	onBuy,
	onSkillBuy,
	canPurchaseSkill,
}: {
	rowId: string | null;
	sections: WSection[];
	res: Resources;
	pts: number;
	onBuy: (id: string) => void;
	onSkillBuy: (id: string) => void;
	canPurchaseSkill: (upgradeId: string) => boolean;
}) {
	const plot = rowId?.startsWith("garden.")
		? GARDEN_PLOTS.find((p) => p.id === (rowId.split(".")[1] as GardenPlotId))
		: undefined;
	const row = rowId && !plot ? findRow(sections, rowId) : null;

	return (
		<div className="w-[360px] min-w-[360px] border-l border-[color:var(--rule)] bg-bg-panel px-5 py-6 overflow-y-auto flex flex-col gap-5">
			{plot ? (
				<GardenPlotDetail
					plot={plot}
					level={
						sections.find((s) => s.id === "garden")?.gardenLevels?.[plot.id] ??
						0
					}
					res={res}
					onBuy={onBuy}
				/>
			) : row ? (
				<UpgradeDetail
					row={row}
					res={res}
					pts={pts}
					onBuy={onBuy}
					onSkillBuy={onSkillBuy}
					canPurchaseSkill={canPurchaseSkill}
				/>
			) : (
				<div className="font-mono text-[10px] text-dim tracking-[0.14em] text-center mt-10">
					HOVER A ROW TO SEE DETAILS
				</div>
			)}
			<div className="mt-auto p-3.5 border border-[color:var(--rule)] bg-bg-inset">
				<div className="font-mono text-[10px] text-dim tracking-[0.14em] leading-relaxed">
					HOVER A ROW TO SEE DETAILS.
					<br />
					RIGHT-CLICK TO UPGRADE INSTANTLY.
				</div>
			</div>
		</div>
	);
}
