import { useState } from "react";
import { useGameStore } from "../../game/store";
import { DetailPanel } from "../components/workshop/DetailPanel";
import { SectionPane } from "../components/workshop/SectionPane";
import { affordableDots, buildSections } from "../components/workshop/sections";
import type { WRow } from "../components/workshop/types";
import { useRowNav } from "../components/workshop/useRowNav";
import { WorkshopSideNav } from "../components/workshop/WorkshopSideNav";

export function Workshop() {
	const purchased = useGameStore((s) => s.upgrades.purchased);
	const ws = useGameStore((s) => s.workshop);
	const res = useGameStore((s) => s.resources);
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

	const buyRow = (row: WRow) =>
		row.skill ? purchaseUpgrade(row.skill.upgradeId) : levelUpWorkshop(row.id);

	useRowNav({
		rows: active.rows,
		pinnedId: pinned?.id ?? null,
		onPin: setPinnedId,
		onBuyPinned: () => pinned && buyRow(pinned),
	});

	return (
		<div className="flex size-full">
			<WorkshopSideNav
				sections={sections}
				activeId={active.id}
				onSelect={(id) => {
					setActiveId(id);
					setPinnedId(null);
				}}
				anyDot={affordableDots(sections, res)}
			/>

			<SectionPane
				section={active}
				res={res}
				pinnedId={pinned?.id ?? null}
				onPin={setPinnedId}
				onBuy={buyRow}
			/>

			<DetailPanel row={pinned} res={res} onBuy={buyRow} />
		</div>
	);
}
