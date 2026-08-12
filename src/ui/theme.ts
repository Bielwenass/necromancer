import type { UnitType } from "../game/types";

/** The squad colour that stands for a unit type wherever one is shown. */
export const UNIT_COLORS: Record<UnitType, string> = {
	skeleton: "var(--sq-skeleton)",
	zombie: "var(--sq-zombie)",
	wraith: "var(--sq-wraith)",
};

export const RARITY_COLORS: Record<string, string> = {
	common: "var(--r-common)",
	uncommon: "var(--r-uncommon)",
	rare: "var(--r-rare)",
	epic: "var(--r-epic)",
	legendary: "var(--r-legendary)",
};

export const RARITY_NAMES: Record<string, string> = {
	common: "Common",
	uncommon: "Uncommon",
	rare: "Rare",
	epic: "Epic",
	legendary: "Legendary",
};

export function rarityColor(rarity: string): string {
	return RARITY_COLORS[rarity] ?? "var(--ink-muted)";
}

export function rarityName(rarity: string): string {
	return RARITY_NAMES[rarity] ?? rarity;
}
