import { UNIT_COLORS } from "../game/data/units";

/**
 * The squad colour that stands for a unit type wherever one is shown — dots,
 * chips, reserve rows, and the combat canvas alike. Re-exported from the game
 * layer rather than declared here, because the canvas can't read a CSS variable
 * and a mirrored palette would drift.
 */
export { UNIT_COLORS };

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
