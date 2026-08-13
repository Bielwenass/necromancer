import type { TabId } from "../components/chrome/TabBar";
import { Screen } from "../components/common/Screen";
import { RitualPanel } from "../components/ritual/RitualPanel";

interface RitualProps {
	onTabChange: (tab: TabId) => void;
}

export function Ritual({ onTabChange }: RitualProps) {
	return (
		<Screen
			tab="ritual"
			onTabChange={onTabChange}
			stageClassName="max-md:overflow-y-auto"
		>
			<div className="flex-1 flex max-md:flex-col">
				<RitualPanel poolId="banner" />
				<RitualPanel poolId="carrion" />
				<RitualPanel poolId="forbidden" />
			</div>
		</Screen>
	);
}
