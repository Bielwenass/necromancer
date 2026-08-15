import { Fragment } from "react";
import type { Resources } from "../../../game/types";
import { RowGroupDivider } from "./RowGroupDivider";
import { isRowMaxed } from "./sections";
import type { WorkshopRow, WorkshopSection } from "./types";
import { UpgradeRow } from "./UpgradeRow";
import { WorkshopRowIcon } from "./WorkshopRowIcon";

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
			<div className="px-8 pt-6 pb-5 border-b border-[color:var(--rule)] shrink-0">
				<div className="flex items-end gap-[22px] mt-2.5">
					<WorkshopRowIcon
						kind={section.icon}
						size={44}
						color={section.unlocked ? "var(--ink-bone)" : "var(--ink-dim)"}
					/>
					<div>
						<div className="font-display text-4xl text-bone tracking-[0.16em] uppercase leading-none">
							{section.name}
						</div>
						<div className="font-body italic text-sm text-parchm mt-1.5">
							{section.subtitle}
						</div>
					</div>
				</div>
			</div>

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
