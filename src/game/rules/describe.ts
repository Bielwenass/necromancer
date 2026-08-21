import { DUNGEON_DEFS } from "../data/dungeons";
import { AFFIX_DEFS, SLOT_LABELS } from "../data/relics";
import { UNIT_TYPES } from "../data/units";
import {
	CRYPT_CONFIG,
	type CryptKey,
	TRAVEL_SPEED_PER_LEVEL,
} from "../data/workshop";
import type {
	AffixEffect,
	DerivedFlagKey,
	DungeonDef,
	GlobalStatKey,
	UnitStatKey,
	UnitType,
	UpgradeEffect,
	UpgradeNode,
} from "../types";
import { relicUpgradeMultiplier } from "./relics";
import { squadSizeFromLevel } from "./workshop";

function pct(value: number): string {
	const n = Math.round(value * 1000) / 10;
	return `${n}%`;
}

function signed(value: number, render: (abs: number) => string): string {
	// U+2212 MINUS SIGN; a hyphen reads as a dash mid-sentence.
	return value < 0 ? `−${render(-value)}` : `+${render(value)}`;
}

const GLOBAL_LABELS: Record<
	GlobalStatKey,
	{ label: string; pct: boolean; invert?: boolean }
> = {
	bonesPassiveMult: { label: "passive bone income", pct: true },
	boneYieldBonus: { label: "bone yield", pct: true },
	soulsYieldBonus: { label: "soul yield", pct: true },
	corpseYieldBonus: { label: "corpse yield", pct: true },
	maxSquadSize: { label: "max squad size", pct: false },
	maxSquads: { label: "max squads", pct: false },
	soulHarvestBonus: { label: "soul drop chance", pct: true },
	squadTravelSpeedBonus: { label: "travel & return speed", pct: true },
	// A bonus here reduces the price, so it reads with the opposite sign.
	summonCostBonus: { label: "skeleton summon cost", pct: true, invert: true },
	bannerChanceBonus: { label: "chance of a bonus banner", pct: true },
	clearMultBonus: { label: "repeat-clear payout", pct: true },
	reanimateChance: { label: "chance a lost unit walks home", pct: true },
	groupTacticsBonus: { label: "damage with all three unit types", pct: true },
	enemyHpPenalty: { label: "enemy HP", pct: true, invert: true },
	enemyDmgPenalty: { label: "enemy damage", pct: true, invert: true },
	pityReduction: { label: "Ritual pity threshold", pct: true, invert: true },
};

const UNIT_STAT_LABELS: Record<UnitStatKey, string> = {
	hpFlat: "HP",
	hpBonus: "HP",
	dmgFlat: "damage",
	dmgBonus: "damage",
	speedFlat: "speed",
	speedBonus: "speed",
	lifesteal: "lifesteal",
	regen: "HP regenerated per second",
	berserk: "damage at zero HP",
	revive: "HP on the one revival",
	vanguard: "damage in the opening seconds",
	overwhelm: "damage per enemy outnumbered",
	executioner: "damage against wounded targets",
	spectral: "damage against unwounded targets",
	lastStand: "damage once the squad is nearly wiped",
};

const UNIT_NAMES: Record<UnitType, string> = {
	skeleton: "skeleton",
	zombie: "zombie",
	wraith: "wraith",
};

const FLAG_LABELS: Record<DerivedFlagKey, string> = {
	zombiesUnlocked: "Unlocks zombies",
	wraithsUnlocked: "Unlocks wraiths",
	corpsesUnlocked: "Clears start dropping corpses",
	soulsUnlocked: "Clears start dropping souls",
	ritualUnlocked: "Unlocks the Ritual",
	reliquaryUnlocked: "Unlocks the Reliquary",
	autoDeploy: "Enables auto-deploy",
	phylactery: "Grants a free banner Ritual pull on a timer",
};

function describeGlobal(
	stat: GlobalStatKey,
	op: "add" | "mult" | "pctOfSelf",
	value: number,
): string {
	const meta = GLOBAL_LABELS[stat];

	if (op === "mult") {
		return Number.isInteger(value)
			? `×${value} ${meta.label}`
			: `${signed(value - 1, pct)} ${meta.label}`;
	}

	const magnitude = meta.pct || op === "pctOfSelf" ? pct : String;
	const shown = meta.invert ? -value : value;
	return `${signed(shown, magnitude)} ${meta.label}`;
}

function describeUnitEffect(
	units: readonly UnitType[],
	stat: UnitStatKey,
	value: number,
): string {
	const who =
		units.length === UNIT_TYPES.length
			? " (all units)"
			: ` ${units.map((u) => UNIT_NAMES[u]).join(" and ")}`;
	const flat = stat.endsWith("Flat");
	const magnitude = flat ? String : pct;
	return units.length === UNIT_TYPES.length
		? `${signed(value, magnitude)} ${UNIT_STAT_LABELS[stat]}${who}`
		: `${signed(value, magnitude)}${who} ${UNIT_STAT_LABELS[stat]}`;
}

export function describeEffect(effect: UpgradeEffect): string {
	switch (effect.kind) {
		case "global":
			return describeGlobal(effect.stat, effect.op, effect.value);
		case "unit":
			return describeUnitEffect(effect.units, effect.stat, effect.value);
		case "flag":
			return FLAG_LABELS[effect.flag];
		case "slot":
			return `Opens relic slot ${SLOT_LABELS[effect.slot]}`;
	}
}

export function describeUpgradeEffects(node: UpgradeNode): string[] {
	return node.effects.map(describeEffect);
}

export function summarizeUpgradeEffects(node: UpgradeNode): string {
	const sentence = (text: string) => text.replace(/\.$/, "");
	const parts = describeUpgradeEffects(node);
	if (node.description) parts.push(sentence(node.description));
	return `${parts.join(". ")}.`;
}

function asShownPercent(value: number): number {
	return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100;
}

/**
 * Every mechanical line for one rolled affix. Mirrors `applyAffixEffect`: the
 * roll is a percentage and each effect takes its own `scale` of it.
 */
export function describeAffixEffects(
	affixId: string,
	value: number,
	upgradeLevel = 0,
): string[] {
	const def = AFFIX_DEFS[affixId];
	if (!def) return [];
	const rolled = (value * relicUpgradeMultiplier(upgradeLevel)) / 100;
	return def.effects.map((effect) => describeAffixEffect(effect, rolled));
}

function describeAffixEffect(effect: AffixEffect, rolled: number): string {
	switch (effect.kind) {
		case "global":
			return describeGlobal(
				effect.stat,
				effect.op,
				asShownPercent(rolled * (effect.scale ?? 1)),
			);
		case "unit":
			return describeUnitEffect(
				effect.units,
				effect.stat,
				asShownPercent(rolled * (effect.scale ?? 1)),
			);
	}
}

export function describeUnlock(def: DungeonDef): string {
	const rule = def.unlockCondition;

	if (rule.length === 0) return "Available from the start";

	const name = (id: string) => DUNGEON_DEFS[id]?.name ?? id;
	const times = (n: number) => (n === 1 ? "" : ` ${n} times`);

	const parts = rule.map((r) => `${name(r.dungeonId)}${times(r.count)}`);
	const list =
		parts.length > 1
			? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
			: parts[0];
	return `Clear ${list}`;
}

export function describeCryptTrack(key: CryptKey): string {
	switch (key) {
		case "squadSize":
			return `+${CRYPT_CONFIG.squadSize.perLevelBase} max squad size per level, +1 more every ${CRYPT_CONFIG.squadSize.levelsPerStep}`;
		case "travelSpeed":
			return `+${pct(TRAVEL_SPEED_PER_LEVEL)} travel & return speed per level`;
	}
}

export function describeCryptLevel(key: CryptKey, level: number): string {
	switch (key) {
		case "squadSize":
			return `+${squadSizeFromLevel(level)}`;
		case "travelSpeed":
			return `+${pct(level * TRAVEL_SPEED_PER_LEVEL)}`;
	}
}
