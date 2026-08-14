import { Fragment } from "react";
import type { Resources } from "../../../game/types";
import { RowGroupDivider } from "./RowGroupDivider";
import { SectionHeader } from "./SectionHeader";
import { SectionLocked } from "./SectionLocked";
import { isRowMaxed } from "./sections";
import type { WorkshopRow, WorkshopSection } from "./types";
import { UpgradeRow } from "./UpgradeRow";

export function SectionPane({
	section,
	resources,
	pinnedId,
	onPin,
	onBuy,
}: {
	section: WorkshopSection;
	resources: Resources;
	pinnedId: string | null;
	onPin: (id: string) => void;
	onBuy: (row: WorkshopRow) => void;
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
								resources={resources}
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
