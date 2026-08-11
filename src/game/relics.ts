import { AFFIX_DEFS, RELIC_BASES } from "./data/relics";
import type { Rarity, Relic, SlotId } from "./types";

let relicCounter = 0;

function rollPosition(rarity: Rarity): number {
	// if (Math.random() < 0.8) {
	//   // center band 40-60%
	//   return 0.4 + Math.random() * 0.2;
	// }
	return Math.random() + POS_BOOST_RARITY[rarity]; // full range with rarity boost
}

function rollValue(range: [number, number], pos: number): number {
	return range[0] + (range[1] - range[0]) * pos;
}

const MINOR_COUNT: Record<Rarity, number> = {
	common: 0,
	uncommon: 1,
	rare: 2,
	epic: 3,
	legendary: 3,
};

const POS_BOOST_RARITY: Record<Rarity, number> = {
	common: 0.0,
	uncommon: 0.1,
	rare: 0.2,
	epic: 0.35,
	legendary: 0.5,
};

export function rollRelic(baseId: string, rarity: Rarity): Relic {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	if (!base) throw new Error(`Unknown relic base: ${baseId}`);

	const mainPos = rollPosition(rarity);
	const mainAffixDef = AFFIX_DEFS[base.mainAffixId];
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

	// Suppress unused variable warning
	void mainAffixDef;

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

export const DUST_VALUES: Record<Rarity, number> = {
	common: 1,
	uncommon: 2,
	rare: 5,
	epic: 10,
	legendary: 30,
};

/**
 * A relic may only occupy a slot listed on its base. Unknown bases are rejected
 * rather than allowed through, so a bad `baseId` can't quietly equip anywhere.
 */
export function canEquipInSlot(baseId: string, slotId: SlotId): boolean {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	return base?.slotIds.includes(slotId) ?? false;
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
	const boosted = value * (1 + upgradeLevel * 0.1);
	if (unit === "%") {
		return `+${Math.round(boosted)}%`;
	}
	return `+${Math.round(boosted)}`;
}
