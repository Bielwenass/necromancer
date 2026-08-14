import { UNIT_TYPES } from "../../../game/rules/units";
import type {
	DungeonDef,
	Squad,
	SquadState,
	UnitType,
} from "../../../game/types";
import { UNIT_COLORS } from "../../theme";

/** Two-letter tag per unit type, for dense readouts like "12sk 3wr". */
const UNIT_TAGS: Record<UnitType, string> = {
	skeleton: "sk",
	zombie: "zm",
	wraith: "wr",
};

/** A squad's composition as tagged counts, omitting the types it doesn't carry. */
export function compositionLabel(
	composition: Record<UnitType, number>,
): string {
	return UNIT_TYPES.filter((type) => composition[type] > 0)
		.map((type) => `${composition[type]}${UNIT_TAGS[type]}`)
		.join(" ");
}

/** Tier badge colour and roman numeral for a dungeon. */
export const TIER_DECORATION: Record<
	DungeonDef["tier"],
	{ color: string; label: string }
> = {
	1: { color: "var(--r-common)", label: "I" },
	2: { color: "var(--r-uncommon)", label: "II" },
	3: { color: "var(--r-rare)", label: "III" },
	4: { color: "var(--r-epic)", label: "IV" },
};

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
