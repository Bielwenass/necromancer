import {
	AFFIX_DEFS,
	DUST_VALUES,
	MINOR_COUNT,
	POS_BOOST_RARITY,
	RARITY_ORDER,
	RELIC_BASES,
	RELIC_UPGRADE_STEP,
} from "../data/relics";
import type { Affix, Rarity, Relic, RelicSlotType, SlotId } from "../types";

export { DUST_VALUES };

let relicCounter = 0;

function rollPosition(rarity: Rarity): number {
	return Math.random() + POS_BOOST_RARITY[rarity];
}

function rollValue(range: [number, number], pos: number): number {
	return range[0] + (range[1] - range[0]) * pos;
}

/** Where a rarity sits on the ladder. Used to compare gacha guarantees. */
export function rarityRank(r: Rarity): number {
	return RARITY_ORDER.indexOf(r);
}

/**
 * Whether a relic of `rarity` is allowed to carry this affix. An affix with no
 * `minRarity` is open to everything.
 */
export function affixAllowedAt(affixId: string, rarity: Rarity): boolean {
	const min = AFFIX_DEFS[affixId]?.minRarity;
	return min === undefined || rarityRank(rarity) >= rarityRank(min);
}

export function rollRelic(baseId: string, rarity: Rarity): Relic {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	if (!base) throw new Error(`Unknown relic base: ${baseId}`);

	const mainPos = rollPosition(rarity);
	let mainValue = rollValue(base.mainAffixRange, mainPos);

	// The base's signature power, if this relic rolled rare enough for it. Rolled
	// before the minors because it takes one of their slots rather than adding a
	// row — three affixes is the ceiling, so a signature costs a minor.
	const sigId = base.signatureAffixId;
	const sigDef = sigId ? AFFIX_DEFS[sigId] : undefined;
	let uniqueAffix: Affix | undefined;
	if (sigId && sigDef && affixAllowedAt(sigId, rarity)) {
		const pos = rollPosition(rarity);
		uniqueAffix = {
			id: sigId,
			value: rollValue(sigDef.range, pos),
			rollPosition: pos,
		};
	}

	const minorCount = Math.max(0, MINOR_COUNT[rarity] - (uniqueAffix ? 1 : 0));
	// A gated affix is never drawn here — a base grants its signature outright or
	// not at all, so the two can't compete for the same slot.
	const pool = base.minorAffixPool.filter(
		(id) =>
			id !== base.signatureAffixId && AFFIX_DEFS[id]?.minRarity === undefined,
	);
	const minorAffixes = [];

	for (let i = 0; i < minorCount && pool.length > 0; i++) {
		const idx = Math.floor(Math.random() * pool.length);
		const affixId = pool.splice(idx, 1)[0];
		const affixDef = AFFIX_DEFS[affixId];
		if (!affixDef) continue;
		const pos = rollPosition(rarity);
		const value = rollValue(affixDef.range, pos);
		// Drawing the base's own main affix concentrates the roll instead of
		// taking a row: fewer, bigger numbers, and a value that may legitimately
		// exceed `mainAffixRange`. That spike is the point.
		if (base.mainAffixId === affixId) {
			mainValue += value;
		} else {
			minorAffixes.push({ id: affixId, value, rollPosition: pos });
		}
	}

	const allPositions = [
		mainPos,
		...minorAffixes.map((a) => a.rollPosition),
		...(uniqueAffix ? [uniqueAffix.rollPosition] : []),
	];
	const quality = Math.round(
		(allPositions.reduce((s, p) => s + p, 0) / allPositions.length) * 100,
	);

	return {
		id: `relic-${++relicCounter}-${Date.now()}`,
		baseId,
		rarity,
		mainAffix: {
			id: base.mainAffixId,
			value: mainValue,
			rollPosition: mainPos,
		},
		minorAffixes,
		uniqueAffix,
		upgradeLevel: 0,
		duplicateCount: 0,
		quality,
		isNew: true,
	};
}

/** Every affix on a relic, signature included, in display order. */
export function allAffixes(relic: Relic): Affix[] {
	return [
		relic.mainAffix,
		...relic.minorAffixes,
		...(relic.uniqueAffix ? [relic.uniqueAffix] : []),
	];
}

/** Dust paid for sacrificing a batch of relics. */
export function dustValue(relics: Pick<Relic, "rarity">[]): number {
	return relics.reduce((sum, r) => sum + DUST_VALUES[r.rarity], 0);
}

/** Affix multiplier from a relic's upgrade level. */
export function relicUpgradeMultiplier(upgradeLevel: number): number {
	return 1 + upgradeLevel * RELIC_UPGRADE_STEP;
}

/**
 * A relic may only occupy a slot listed on its base. Unknown bases are rejected
 * rather than allowed through, so a bad `baseId` can't quietly equip anywhere.
 */
export function canEquipInSlot(baseId: string, slotId: SlotId): boolean {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	return base?.slotIds.includes(slotId) ?? false;
}

/** The slot family a relic belongs to, or null when its base is unknown. */
export function getRelicSlotType(baseId: string): RelicSlotType | null {
	return RELIC_BASES.find((b) => b.id === baseId)?.slot ?? null;
}

export function getAffixLabel(affixId: string): string {
	return AFFIX_DEFS[affixId]?.label ?? affixId;
}

/** The affix's qualitative line, where its table entry carries one. */
export function getAffixDescription(affixId: string): string | undefined {
	return AFFIX_DEFS[affixId]?.description;
}

/** The rolled value as the card shows it. A trade-off affix reads as both halves "+24% / −12%" */
export function formatAffixValue(
	affixId: string,
	value: number,
	upgradeLevel = 0,
): string {
	const def = AFFIX_DEFS[affixId];
	const unit = def?.unit ?? "";
	const boosted = value * relicUpgradeMultiplier(upgradeLevel);
	const one = (n: number) =>
		// U+2212 MINUS SIGN, matching the effect descriptions.
		`${n < 0 ? "−" : "+"}${Math.round(Math.abs(n))}${unit}`;

	const scales = (def?.effects ?? []).map((e) => e.scale ?? 1);
	// `dreadCommand` scales by 100 to express a flat count; that is a unit
	// conversion, not a second term, so a single effect always prints as one.
	if (scales.length < 2) return one(boosted);
	return scales.map((s) => one(boosted * s)).join(" / ");
}
