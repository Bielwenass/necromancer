import { useEffect, useState } from "react";
import { useGameLifecycle } from "./game/useGameLifecycle";
import { CryptMap } from "./ui/screens/CryptMap";
import { Reliquary } from "./ui/screens/Reliquary";
import { Ritual } from "./ui/screens/Ritual";
import { Upgrades } from "./ui/screens/Upgrades";

type TabId = "crypt" | "reliquary" | "ritual" | "upgrades";

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
			switch (e.key) {
				case "1":
					setActiveTab("crypt");
					break;
				case "2":
					setActiveTab("reliquary");
					break;
				case "3":
					setActiveTab("ritual");
					break;
				case "4":
					setActiveTab("upgrades");
					break;
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [catchup?.done, dismissCatchup]);

	return (
		<div className="w-full h-full bg-bg-canvas relative">
			{activeTab === "crypt" && <CryptMap onTabChange={setActiveTab} />}
			{activeTab === "reliquary" && <Reliquary onTabChange={setActiveTab} />}
			{activeTab === "ritual" && <Ritual onTabChange={setActiveTab} />}
			{activeTab === "upgrades" && <Upgrades onTabChange={setActiveTab} />}

			{/* Offline catchup overlay */}
			{catchup !== null && (
				<div className="fixed inset-0 bg-[rgba(0,0,0,0.88)] flex flex-col items-center justify-center z-[500]">
					<div className="display text-sm text-bone !tracking-[0.22em] mb-[18px]">
						{catchup.done ? "CAUGHT UP" : "CATCHING UP..."}
					</div>

					<div className="w-60 h-0.5 bg-rule mb-6">
						<div
							className="h-full bg-bone transition-[width] duration-100"
							style={{ width: `${catchup.progress * 100}%` }}
						/>
					</div>

					<div className="flex gap-6 mb-[14px]">
						{[
							{ label: "BONES", value: catchup.stats.bonesGained },
							{ label: "COINS", value: catchup.stats.coinsGained },
							{ label: "SOULS", value: catchup.stats.soulsGained },
						].map(({ label, value }) => (
							<div key={label} className="text-center min-w-[52px]">
								<div className="mono text-sm text-bone">
									+{value.toLocaleString()}
								</div>
								<div className="mono text-[9px] text-dim tracking-[0.1em] mt-[3px]">
									{label}
								</div>
							</div>
						))}
					</div>

					<div
						className={`mono text-[10px] text-dim tracking-[0.08em] ${catchup.done ? "mb-6" : ""}`}
					>
						{catchup.stats.eventsProcessed} events processed
					</div>

					{catchup.done && (
						<button
							type="button"
							onClick={dismissCatchup}
							className="px-7 py-2 border border-bone text-bone bg-transparent cursor-pointer display text-xs !tracking-[0.22em]"
						>
							CONTINUE
						</button>
					)}
				</div>
			)}
		</div>
	);
}
