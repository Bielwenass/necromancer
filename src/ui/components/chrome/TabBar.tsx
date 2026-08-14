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
}[] = [
	{ id: "crypt", label: "Crypt", shortcutKey: "1", Icon: IconCrypt },
	{
		id: "reliquary",
		label: "Reliquary",
		shortcutKey: "2",
		Icon: IconReliquary,
	},
	{ id: "ritual", label: "Ritual", shortcutKey: "3", Icon: IconRitual },
	{ id: "workshop", label: "Workshop", shortcutKey: "4", Icon: IconWorkshop },
];

export const TAB_KEYS: Record<string, TabId> = Object.fromEntries(
	TABS.map((t) => [t.shortcutKey, t.id]),
);

export function TabBar({ active, onTabChange }: TabBarProps) {
	return (
		<div className="bar-tabs">
			{TABS.map((t) => {
				const isActive = t.id === active;
				return (
					<button
						type="button"
						key={t.id}
						className={`tab ${isActive ? " active" : ""}`}
						onClick={() => onTabChange(t.id)}
					>
						<t.Icon
							size={24}
							color={isActive ? "var(--c-coin)" : "var(--ink-muted)"}
						/>
						<span className="text-lg max-md:text-xs/normal">{t.label}</span>
						<span className="key max-md:hidden">{t.shortcutKey}</span>
					</button>
				);
			})}
		</div>
	);
}
