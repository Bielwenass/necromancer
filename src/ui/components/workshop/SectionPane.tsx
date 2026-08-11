import { Fragment } from "react";
import type { Resources } from "../../../game/types";
import { RowGroupDivider } from "./RowGroupDivider";
import { SectionHeader } from "./SectionHeader";
import { SectionLocked } from "./SectionLocked";
import { isRowMaxed } from "./sections";
import type { WRow, WSection } from "./types";
import { UpgradeRow } from "./UpgradeRow";

/** Center column: the section header plus its rows, finished ones last. */
export function SectionPane({
	section,
	res,
	pts,
	pinnedId,
	onPin,
	onBuy,
}: {
	section: WSection;
	res: Resources;
	pts: number;
	pinnedId: string | null;
	onPin: (id: string) => void;
	onBuy: (row: WRow) => void;
}) {
	const firstDone = section.rows.findIndex(isRowMaxed);

	return (
		<div className="flex-1 overflow-y-auto flex flex-col">
			<SectionHeader section={section} />

			{!section.unlocked && <SectionLocked section={section} />}

			{section.unlocked && (
				<div>
					{section.rows.map((r, i) => (
						<Fragment key={r.id}>
							{i === firstDone && <RowGroupDivider label="Inscribed" />}
							<UpgradeRow
								row={r}
								res={res}
								pts={pts}
								pinned={r.id === pinnedId}
								onPin={onPin}
								onBuy={onBuy}
							/>
						</Fragment>
					))}
				</div>
			)}
		</div>
	);
}
