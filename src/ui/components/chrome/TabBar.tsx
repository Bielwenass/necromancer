import { useMemo } from "react";
import { UPGRADE_NODES } from "../../../game/data/upgrades";
import { useGameStore } from "../../../game/store";
import type { DerivedFlagKey } from "../../../game/types";
import { IconCrypt, IconReliquary, IconRitual, IconWorkshop } from "../icons";
import type { IconComponent } from "../icons/IconProps";

export type TabId = "crypt" | "reliquary" | "ritual" | "workshop";

interface TabBarProps {
	active: TabId;
	onTabChange: (tab: TabId) => void;
}

const TABS: {
	id: TabId;
	label: string;
	shortcutKey: string;
	Icon: IconComponent;
	/** A gated tab sits on the bar inert until its flag opens. */
	flag?: DerivedFlagKey;
}[] = [
	{ id: "crypt", label: "Crypt", shortcutKey: "1", Icon: IconCrypt },
	{ id: "workshop", label: "Workshop", shortcutKey: "2", Icon: IconWorkshop },
	{
		id: "ritual",
		label: "Ritual",
		shortcutKey: "3",
		Icon: IconRitual,
		flag: "ritualUnlocked",
	},
	{
		id: "reliquary",
		label: "Reliquary",
		shortcutKey: "4",
		Icon: IconReliquary,
		flag: "reliquaryUnlocked",
	},
];

/** The node that opens a gated tab, so the seal names its own key. */
const opener = (flag: DerivedFlagKey) =>
	UPGRADE_NODES.find((n) =>
		n.effects.some((e) => e.kind === "flag" && e.flag === flag),
	)?.name;

export function useTabs() {
	const derived = useGameStore((s) => s.derived);
	return useMemo(
		() => TABS.map((t) => ({ ...t, locked: !!t.flag && !derived[t.flag] })),
		[derived],
	);
}

export function TabBar({ active, onTabChange }: TabBarProps) {
	const tabs = useTabs();

	return (
		<div className="bar-tabs">
			{tabs.map((t) => {
				const isActive = t.id === active;
				const color = t.locked
					? "var(--ink-faint)"
					: isActive
						? "var(--c-coin)"
						: "var(--ink-muted)";
				const seal = t.flag ? opener(t.flag) : undefined;
				return (
					<button
						type="button"
						key={t.id}
						disabled={t.locked}
						className={`tab ${isActive ? " active" : ""}`}
						onClick={() => onTabChange(t.id)}
						title={t.locked && seal ? `Sealed until ${seal}` : undefined}
					>
						<t.Icon size={24} color={color} />
						<span className="text-lg max-md:text-xs/normal">{t.label}</span>
						<span className="key max-md:hidden">
							{t.locked ? "SEALED" : t.shortcutKey}
						</span>
					</button>
				);
			})}
		</div>
	);
}
