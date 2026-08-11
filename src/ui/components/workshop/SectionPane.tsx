import type { Resources } from "../../../game/types";
import { GardenGrid } from "./GardenGrid";
import { SectionHeader } from "./SectionHeader";
import { SectionLocked } from "./SectionLocked";
import type { WSection } from "./types";
import { UpgradeRow } from "./UpgradeRow";

/** Center column: the section header plus whichever body the section calls for. */
export function SectionPane({
	section,
	res,
	pts,
	focusedId,
	onFocus,
	onBuy,
}: {
	section: WSection;
	res: Resources;
	pts: number;
	focusedId: string | null;
	onFocus: (id: string) => void;
	onBuy: (id: string) => void;
}) {
	return (
		<div className="flex-1 overflow-y-auto flex flex-col">
			<SectionHeader section={section} />

			{!section.unlocked && <SectionLocked section={section} />}

			{section.unlocked &&
				(section.type === "garden" ? (
					<GardenGrid
						levels={section.gardenLevels ?? []}
						res={res}
						focusedId={focusedId}
						onFocus={onFocus}
						onBuy={onBuy}
					/>
				) : (
					<div>
						{(section.rows ?? []).map((r) => (
							<UpgradeRow
								key={r.id}
								row={r}
								res={res}
								pts={pts}
								focused={r.id === focusedId}
								onFocus={onFocus}
								onBuy={onBuy}
							/>
						))}
					</div>
				))}
		</div>
	);
}
