import type { IconComponent } from "../icons/IconProps";

/**
 * One projected payout figure on a dungeon card. `boosted` brightens the value
 * whenever player bonuses push it above the bare loot table, and `title` spells
 * the breakdown out on hover.
 */
export function DungeonLootStat({
	icon: Icon,
	value,
	boosted,
	title,
}: {
	icon: IconComponent;
	value: string;
	boosted?: boolean;
	title: string;
}) {
	return (
		<span
			title={title}
			className={`flex items-center gap-1.5 ${boosted ? "text-bone" : ""}`}
		>
			<Icon size={16} />
			{value}
		</span>
	);
}
