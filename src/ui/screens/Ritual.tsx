import type { TabId } from "../components/TabBar";
import { TabBar } from "../components/TabBar";
import { TopBar } from "../components/TopBar";
import { RitualPanel } from "./RitualPanel";

interface RitualProps {
	onTabChange: (tab: TabId) => void;
}

export function Ritual({ onTabChange }: RitualProps) {
	return (
		<div className="necro">
			<TopBar />
			<div className="stage">
				<div className="flex-1 flex">
					<RitualPanel poolId="banner" />
					<RitualPanel poolId="carrion" />
					<RitualPanel poolId="forbidden" />
				</div>
			</div>
			<TabBar active="ritual" onTabChange={onTabChange} />
		</div>
	);
}
