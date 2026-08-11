import { useState } from "react";
import { useGameStore } from "../../game/store";
import { canPurchaseUpgrade } from "../../game/upgrades";
import { DetailPanel } from "../components/workshop/DetailPanel";
import { SectionPane } from "../components/workshop/SectionPane";
import { affordableDots, buildSections } from "../components/workshop/sections";
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
	const [focusedId, setFocusedId] = useState<string | null>(null);

	const sections = buildSections(
		purchased,
		ws,
		zombiesUnlocked,
		wraithsUnlocked,
	);
	const active = sections.find((s) => s.id === activeId) ?? sections[0];

	return (
		<div className="flex size-full">
			<WorkshopSideNav
				sections={sections}
				activeId={activeId}
				onSelect={(id) => {
					setActiveId(id);
					setFocusedId(null);
				}}
				anyDot={affordableDots(sections, res, pts)}
			/>

			<SectionPane
				section={active}
				res={res}
				pts={pts}
				focusedId={focusedId}
				onFocus={setFocusedId}
				onBuy={levelUpWorkshop}
			/>

			<DetailPanel
				rowId={focusedId}
				sections={sections}
				res={res}
				pts={pts}
				onBuy={levelUpWorkshop}
				onSkillBuy={purchaseUpgrade}
				canPurchaseSkill={(upgradeId) =>
					canPurchaseUpgrade(gameState, upgradeId)
				}
			/>
		</div>
	);
}
