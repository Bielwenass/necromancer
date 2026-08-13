import { useState } from "react";
import { useGameStore } from "../../game/store";
import type { TabId } from "../components/chrome/TabBar";
import { Modal } from "../components/common/Modal";
import { Screen } from "../components/common/Screen";
import { SectionPane } from "../components/workshop/SectionPane";
import { affordableDots, buildSections } from "../components/workshop/sections";
import type { WorkshopRow } from "../components/workshop/types";
import { UpgradeDetail } from "../components/workshop/UpgradeDetail";
import { UpgradeDetailPanel } from "../components/workshop/UpgradeDetailPanel";
import { useRowNav } from "../components/workshop/useRowNav";
import { WorkshopSideNav } from "../components/workshop/WorkshopSideNav";

interface WorkshopProps {
	onTabChange: (tab: TabId) => void;
}

export function Workshop({ onTabChange }: WorkshopProps) {
	const purchased = useGameStore((s) => s.upgrades.purchased);
	const ws = useGameStore((s) => s.workshop);
	const resources = useGameStore((s) => s.resources);
	const zombiesUnlocked = useGameStore((s) => s.derived.zombiesUnlocked);
	const wraithsUnlocked = useGameStore((s) => s.derived.wraithsUnlocked);
	const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
	const levelUpWorkshop = useGameStore((s) => s.levelUpWorkshop);

	const [activeId, setActiveId] = useState("summoning");
	const [pinnedId, setPinnedId] = useState<string | null>(null);

	const sections = buildSections(
		purchased,
		ws,
		zombiesUnlocked,
		wraithsUnlocked,
	);
	const active = sections.find((s) => s.id === activeId) ?? sections[0];

	// A pin from another section — or one whose row vanished — falls back to the
	// top row, so the detail panel always describes something on screen.
	const pinned =
		active.rows.find((r) => r.id === pinnedId) ?? active.rows[0] ?? null;

	const buyRow = (row: WorkshopRow) =>
		row.skill ? purchaseUpgrade(row.skill.upgradeId) : levelUpWorkshop(row.id);

	useRowNav({
		rows: active.rows,
		pinnedId: pinned?.id ?? null,
		onPin: setPinnedId,
		onBuyPinned: () => pinned && buyRow(pinned),
	});

	return (
		<Screen
			tab="workshop"
			onTabChange={onTabChange}
			overlay={
				pinnedId &&
				pinned && (
					<div className="hidden max-md:block">
						<Modal
							label={pinned.name}
							onClose={() => setPinnedId(null)}
							className="items-end"
						>
							<div className="w-full max-h-[75vh] overflow-y-auto bg-bg-panel border-t border-[color:var(--rule-strong)] px-5 py-6">
								<UpgradeDetail
									row={pinned}
									resources={resources}
									onBuy={buyRow}
								/>
							</div>
						</Modal>
					</div>
				)
			}
		>
			<div className="flex size-full max-md:flex-col">
				<WorkshopSideNav
					sections={sections}
					activeId={active.id}
					onSelect={(id) => {
						setActiveId(id);
						setPinnedId(null);
					}}
					anyDot={affordableDots(sections, resources)}
				/>

				<SectionPane
					section={active}
					resources={resources}
					pinnedId={pinned?.id ?? null}
					onPin={setPinnedId}
					onBuy={buyRow}
				/>

				<UpgradeDetailPanel row={pinned} resources={resources} onBuy={buyRow} />
			</div>
		</Screen>
	);
}
