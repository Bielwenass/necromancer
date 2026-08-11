import type { TabId } from "../components/TabBar";
import { TabBar } from "../components/TabBar";
import { TopBar } from "../components/TopBar";
import { Workshop } from "./Workshop";

interface UpgradesProps {
	onTabChange: (tab: TabId) => void;
}

export function Upgrades({ onTabChange }: UpgradesProps) {
	return (
		<div className="necro">
			<TopBar />

			<div className="stage">
				<Workshop />
			</div>

			<TabBar active="upgrades" onTabChange={onTabChange} />
		</div>
	);
}
