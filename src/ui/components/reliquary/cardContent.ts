import { RELIC_BASES } from "../../../game/data/relics";
import {
	allAffixes,
	formatAffixValue,
	getAffixLabel,
} from "../../../game/rules/relics";
import type { Relic } from "../../../game/types";
import { RARITY_SIGIL } from "./relicCardArt";

interface CardStat {
	id: string;
	label: string;
	value: number;
	/** Formatted for display, upgrade level included. */
	text: string;
	/** The signature roll: why a legendary of this base beats a better common. */
	signature: boolean;
}

export interface CardContent {
	name: string;
	flavor: string;
	slotLabel: string;
	sigil: string;
	serial: string;
	/** main → minors → signature, the order `allAffixes` reads them in. */
	stats: CardStat[];
}

/** Everything both card layouts print, so the two can never disagree. */
export function cardContent(relic: Relic): CardContent {
	const base = RELIC_BASES.find((b) => b.id === relic.baseId);
	const slot = base?.slot ?? "crypt";
	return {
		name: base?.name ?? relic.baseId,
		flavor: base?.description ? `"${base.description}"` : "",
		slotLabel: `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`,
		sigil: RARITY_SIGIL[relic.rarity],
		serial: `REL-${relic.id.split("-")[1].padStart(4, "0")}`,
		stats: allAffixes(relic).map((affix) => ({
			id: affix.id,
			label: getAffixLabel(affix.id),
			value: affix.value,
			text: formatAffixValue(affix.id, affix.value, relic.upgradeLevel),
			signature: affix.id === relic.uniqueAffix?.id,
		})),
	};
}
