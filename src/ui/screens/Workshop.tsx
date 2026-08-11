import { useState } from "react";
import { useGameStore } from "../../game/store";
import { canPurchaseUpgrade } from "../../game/upgrades";
import { DetailPanel } from "../components/workshop/DetailPanel";
import { SectionPane } from "../components/workshop/SectionPane";
import { affordableDots, buildSections } from "../components/workshop/sections";
import type { WRow } from "../components/workshop/types";
import { useRowNav } from "../components/workshop/useRowNav";
import { WorkshopSideNav } from "../components/workshop/WorkshopSideNav";

export function Workshop() {
	const purchased = useGameStore((s) => s.upgrades.purchased);
	const pts = useGameStore((s) => s.upgrades.availablePoints);
	const ws = useGameStore((s) => s.workshop);
	const res = useGameStore((s) => s.resources);
	const zombiesUnlocked = useGameStore((s) => s.derived.zombiesUnlocked);
	const wraithsUnlocked = useGameStore((s) => s.derived.wraithsUnlocked);
	const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);
	const levelUpWorkshop = useGameStore((s) => s.levelUpWorkshop);
	const gameState = useGameStore((s) => s);

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
				anyDot={affordableDots(sections, res, pts)}
			/>

			<SectionPane
				section={active}
				res={res}
				pts={pts}
				pinnedId={pinned?.id ?? null}
				onPin={setPinnedId}
				onBuy={buyRow}
			/>

			<DetailPanel
				row={pinned}
				res={res}
				pts={pts}
				onBuy={buyRow}
				canPurchaseSkill={(upgradeId) =>
					canPurchaseUpgrade(gameState, upgradeId)
				}
			/>
		</div>
	);
}
