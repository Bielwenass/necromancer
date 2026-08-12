import { useEffect, useState } from "react";
import { useGameLifecycle } from "./game/useGameLifecycle";
import { CatchupOverlay } from "./ui/components/chrome/CatchupOverlay";
import { TAB_KEYS, type TabId } from "./ui/components/chrome/TabBar";
import { Crypt } from "./ui/screens/Crypt";
import { Reliquary } from "./ui/screens/Reliquary";
import { Ritual } from "./ui/screens/Ritual";
import { Workshop } from "./ui/screens/Workshop";

export default function App() {
	const { catchup, dismissCatchup } = useGameLifecycle();
	const [activeTab, setActiveTab] = useState<TabId>("crypt");

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
			if (catchup?.done && (e.key === "Enter" || e.key === " ")) {
				e.preventDefault();
				dismissCatchup();
				return;
			}
			const tab = TAB_KEYS[e.key];
			if (tab) setActiveTab(tab);
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [catchup?.done, dismissCatchup]);

	return (
		<div className="w-full h-full bg-bg-canvas relative">
			{activeTab === "crypt" && <Crypt onTabChange={setActiveTab} />}
			{activeTab === "reliquary" && <Reliquary onTabChange={setActiveTab} />}
			{activeTab === "ritual" && <Ritual onTabChange={setActiveTab} />}
			{activeTab === "workshop" && <Workshop onTabChange={setActiveTab} />}

			{catchup !== null && (
				<CatchupOverlay catchup={catchup} onDismiss={dismissCatchup} />
			)}
		</div>
	);
}
