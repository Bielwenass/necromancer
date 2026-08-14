import type React from "react";
import type { TabId } from "../chrome/TabBar";
import { TabBar } from "../chrome/TabBar";
import { TopBar } from "../chrome/TopBar";

interface ScreenProps {
	tab: TabId;
	onTabChange: (tab: TabId) => void;
	className?: string;
	stageClassName?: string;
	/**
	 * Rendered after the tab bar, for modals a screen owns; the stage's flex
	 * layout has no place for them.
	 */
	overlay?: React.ReactNode;
	children: React.ReactNode;
}

/**
 * The frame every screen shares: top bar, a `.stage` between the two bars, and
 * the tab bar. Screens supply only what goes in the stage.
 */
export function Screen({
	tab,
	onTabChange,
	className,
	stageClassName,
	overlay,
	children,
}: ScreenProps) {
	return (
		<div className={className ? `necro ${className}` : "necro"}>
			<TopBar />

			<div className={stageClassName ? `stage ${stageClassName}` : "stage"}>
				{children}
			</div>

			<TabBar active={tab} onTabChange={onTabChange} />

			{overlay}
		</div>
	);
}
