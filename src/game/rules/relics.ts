import {
	AFFIX_DEFS,
	DUST_VALUES,
	MINOR_COUNT,
	POS_BOOST_RARITY,
	RARITY_ORDER,
	RELIC_BASES,
	RELIC_UPGRADE_STEP,
} from "../data/relics";
import type { Rarity, Relic, RelicSlotType, SlotId } from "../types";

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

export function rollRelic(baseId: string, rarity: Rarity): Relic {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	if (!base) throw new Error(`Unknown relic base: ${baseId}`);

	const mainPos = rollPosition(rarity);
	let mainValue = rollValue(base.mainAffixRange, mainPos);

	const minorCount = MINOR_COUNT[rarity];
	const pool = [...base.minorAffixPool];
	const minorAffixes = [];

	for (let i = 0; i < minorCount && pool.length > 0; i++) {
		const idx = Math.floor(Math.random() * pool.length);
		const affixId = pool.splice(idx, 1)[0];
		const affixDef = AFFIX_DEFS[affixId];
		if (!affixDef) continue;
		const pos = rollPosition(rarity);
		const value = rollValue(affixDef.range, pos);
		if (base.mainAffixId === affixId) {
			mainValue += value;
		} else {
			minorAffixes.push({ id: affixId, value, rollPosition: pos });
		}
	}

	const allPositions = [mainPos, ...minorAffixes.map((a) => a.rollPosition)];
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
		upgradeLevel: 0,
		duplicateCount: 0,
		quality,
		isNew: true,
	};
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

function getAffixUnit(affixId: string): string {
	return AFFIX_DEFS[affixId]?.unit ?? "";
}

export function formatAffixValue(
	affixId: string,
	value: number,
	upgradeLevel = 0,
): string {
	const unit = getAffixUnit(affixId);
	const boosted = value * relicUpgradeMultiplier(upgradeLevel);
	if (unit === "%") {
		return `+${Math.round(boosted)}%`;
	}
	return `+${Math.round(boosted)}`;
}
