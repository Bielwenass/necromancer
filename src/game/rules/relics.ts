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

let relicCounter = 0;

function rollPosition(rarity: Rarity): number {
	return Math.random() + POS_BOOST_RARITY[rarity];
}

function rollValue(range: [number, number], pos: number): number {
	return range[0] + (range[1] - range[0]) * pos;
}

export function rarityRank(r: Rarity): number {
	return RARITY_ORDER.indexOf(r);
}

export function affixAllowedAt(affixId: string, rarity: Rarity): boolean {
	const min = AFFIX_DEFS[affixId]?.minRarity;
	return min === undefined || rarityRank(rarity) >= rarityRank(min);
}

export function rollRelic(baseId: string, rarity: Rarity): Relic {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	if (!base) throw new Error(`Unknown relic base: ${baseId}`);

	const mainPos = rollPosition(rarity);
	let mainValue = rollValue(base.mainAffixRange, mainPos);

	// Rolled first because it takes a minor's slot; three affixes is the ceiling.
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
	// Gated affixes are never drawn here, so a signature and the minors can't
	// compete for one slot.
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
		// The base's own main affix folds in, so a rolled value may exceed
		// `mainAffixRange`.
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

export function allAffixes(relic: Relic): Affix[] {
	return [
		relic.mainAffix,
		...relic.minorAffixes,
		...(relic.uniqueAffix ? [relic.uniqueAffix] : []),
	];
}

export function dustValue(relics: Pick<Relic, "rarity">[]): number {
	return relics.reduce((sum, r) => sum + DUST_VALUES[r.rarity], 0);
}

export function relicUpgradeMultiplier(upgradeLevel: number): number {
	return 1 + upgradeLevel * RELIC_UPGRADE_STEP;
}

/** A relic occupies only a slot listed on its base; unknown bases, nowhere. */
export function canEquipInSlot(baseId: string, slotId: SlotId): boolean {
	const base = RELIC_BASES.find((b) => b.id === baseId);
	return base?.slotIds.includes(slotId) ?? false;
}

export function getRelicSlotType(baseId: string): RelicSlotType | null {
	return RELIC_BASES.find((b) => b.id === baseId)?.slot ?? null;
}

export function getAffixLabel(affixId: string): string {
	return AFFIX_DEFS[affixId]?.label ?? affixId;
}

export function getAffixDescription(affixId: string): string | undefined {
	return AFFIX_DEFS[affixId]?.description;
}

/** The rolled value as the card shows it; a trade-off reads "+24% / −12%". */
export function formatAffixValue(
	affixId: string,
	value: number,
	upgradeLevel = 0,
): string {
	const def = AFFIX_DEFS[affixId];
	const unit = def?.unit ?? "";
	const boosted = value * relicUpgradeMultiplier(upgradeLevel);
	const one = (n: number) =>
		`${n < 0 ? "−" : "+"}${Math.round(Math.abs(n))}${unit}`;

	const scales = (def?.effects ?? []).map((e) => e.scale ?? 1);
	// A single effect prints one value; `dreadCommand`'s scale is a unit
	// conversion.
	if (scales.length < 2) return one(boosted);
	return scales.map((s) => one(boosted * s)).join(" / ");
}
