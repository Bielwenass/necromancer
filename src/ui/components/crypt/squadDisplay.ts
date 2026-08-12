import type { Squad, SquadState } from "../../../game/types";
import { UNIT_COLORS } from "../../theme";

/** Tier badge colour and roman numeral for a dungeon. */
export function tierDecoration(tier: 1 | 2 | 3 | 4): {
	color: string;
	label: string;
} {
	if (tier === 4) return { color: "var(--r-epic)", label: "IV" };
	if (tier === 3) return { color: "var(--r-rare)", label: "III" };
	if (tier === 2) return { color: "var(--r-uncommon)", label: "II" };
	return { color: "var(--r-common)", label: "I" };
}

/** A squad takes the colour of the strongest unit type it carries. */
export function squadColor(squad: Squad): string {
	if (squad.composition.wraith > 0) return UNIT_COLORS.wraith;
	if (squad.composition.zombie > 0) return UNIT_COLORS.zombie;
	return UNIT_COLORS.skeleton;
}

/**
 * The glyph that stands for each squad state. Only the glyph is shared — the
 * dungeon card and the legion list word the text beside it differently.
 */
export const SQUAD_STATE_GLYPH: Record<SquadState, string> = {
	idle: "○",
	traveling: "⇢",
	fighting: "⚔",
	returning: "⇠",
};
