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
	/** The number key that jumps to this tab. `App` routes from this field. */
	k: string;
	Icon: IconComponent;
}[] = [
	{ id: "crypt", label: "Crypt", k: "1", Icon: IconCrypt },
	{ id: "reliquary", label: "Reliquary", k: "2", Icon: IconReliquary },
	{ id: "ritual", label: "Ritual", k: "3", Icon: IconRitual },
	{ id: "workshop", label: "Workshop", k: "4", Icon: IconWorkshop },
];

/** Keyboard shortcut → tab, derived from `TABS` so the two can't disagree. */
export const TAB_KEYS: Record<string, TabId> = Object.fromEntries(
	TABS.map((t) => [t.k, t.id]),
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
						className={`tab${isActive ? " active" : ""}`}
						onClick={() => onTabChange(t.id)}
					>
						<t.Icon
							size={24}
							color={isActive ? "var(--c-coin)" : "var(--ink-muted)"}
						/>
						<span className="text-lg">{t.label}</span>
						<span className="key">{t.k}</span>
					</button>
				);
			})}
		</div>
	);
}
