import { DUNGEON_DEFS } from "../data/dungeons";
import { UNIT_TYPES } from "../data/units";
import {
	type CryptKey,
	SQUAD_SIZE_PER_LEVEL,
	TRAVEL_SPEED_PER_LEVEL,
} from "../data/workshop";
import type {
	DerivedFlagKey,
	DungeonDef,
	GlobalStatKey,
	UnitStatKey,
	UnitType,
	UpgradeEffect,
	UpgradeNode,
} from "../types";

/**
 * The player-facing sentence for a rule, generated from the rule itself.
 *
 * Nothing here holds a number of its own: these functions read the same data
 * the simulation reads, so a balance tweak in `data/` moves the text with it.
 *
 * Pure and React-free, like the rest of `rules/`; the UI imports it.
 */

export interface EffectLine {
	text: string;
	/** True for an effect that is declared but not built yet. */
	unimplemented: boolean;
}

/** A decimal bonus as a percentage, without float noise (`0.08` → `8%`). */
function pct(value: number): string {
	const n = Math.round(value * 1000) / 10;
	return `${n}%`;
}

function signed(value: number, render: (abs: number) => string): string {
	// U+2212 MINUS SIGN — a hyphen reads as a dash mid-sentence.
	return value < 0 ? `−${render(-value)}` : `+${render(value)}`;
}

const GLOBAL_LABELS: Record<
	GlobalStatKey,
	{ label: string; pct: boolean; invert?: boolean }
> = {
	bonesPassiveMult: { label: "passive bone income", pct: true },
	boneYieldBonus: { label: "bone yield", pct: true },
	coinYieldBonus: { label: "coin yield", pct: true },
	soulsYieldBonus: { label: "soul yield", pct: true },
	corpseYieldBonus: { label: "corpse yield", pct: true },
	maxSquadSize: { label: "max squad size", pct: false },
	maxSquads: { label: "max squads", pct: false },
	soulHarvestBonus: { label: "soul drop chance", pct: true },
	squadTravelSpeedBonus: { label: "travel & return speed", pct: true },
	// A bonus here *reduces* the price, so it reads with the opposite sign.
	summonCostBonus: { label: "skeleton summon cost", pct: true, invert: true },
};

const UNIT_STAT_LABELS: Record<UnitStatKey, string> = {
	hpFlat: "HP",
	hpBonus: "HP",
	dmgFlat: "damage",
	dmgBonus: "damage",
	speedFlat: "speed",
	speedBonus: "speed",
};

const UNIT_NAMES: Record<UnitType, string> = {
	skeleton: "skeleton",
	zombie: "zombie",
	wraith: "wraith",
};

const FLAG_LABELS: Record<DerivedFlagKey, string> = {
	zombiesUnlocked: "Unlocks zombies",
	wraithsUnlocked: "Unlocks wraiths",
	autoDeploy: "Enables auto-deploy",
};

function describeGlobal(
	stat: GlobalStatKey,
	op: "add" | "mult" | "pctOfSelf",
	value: number,
): string {
	const meta = GLOBAL_LABELS[stat];

	if (op === "mult") {
		// A whole multiplier reads better as ×N; anything else as a percentage.
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
	// "+15% skeleton damage" / "+25% damage (all units)"
	return units.length === UNIT_TYPES.length
		? `${signed(value, magnitude)} ${UNIT_STAT_LABELS[stat]}${who}`
		: `${signed(value, magnitude)}${who} ${UNIT_STAT_LABELS[stat]}`;
}

export function describeEffect(effect: UpgradeEffect): EffectLine {
	switch (effect.kind) {
		case "global":
			return {
				text: describeGlobal(effect.stat, effect.op, effect.value),
				unimplemented: false,
			};
		case "unit":
			return {
				text: describeUnitEffect(effect.units, effect.stat, effect.value),
				unimplemented: false,
			};
		case "flag":
			return { text: FLAG_LABELS[effect.flag], unimplemented: false };
		case "elsewhere":
			return {
				text: effect.note,
				unimplemented: effect.where === "unimplemented",
			};
	}
}

/** Every mechanical line for a node, in declaration order. */
export function describeUpgradeEffects(node: UpgradeNode): EffectLine[] {
	return node.effects.map(describeEffect);
}

/**
 * The node's effects as one sentence, for the compact row layout. An effect
 * that isn't built yet says so rather than reading as a promise.
 */
export function summarizeUpgradeEffects(node: UpgradeNode): string {
	const sentence = (text: string) => text.replace(/\.$/, "");
	const parts = describeUpgradeEffects(node).map((l) =>
		l.unimplemented
			? `${sentence(l.text)} (not yet implemented)`
			: sentence(l.text),
	);
	// The node's own `description` is qualitative colour, where it has one.
	if (node.description) parts.push(sentence(node.description));
	return `${parts.join(". ")}.`;
}

/** What the player must do to open a dungeon. */
export function describeUnlock(def: DungeonDef): string {
	const rule = def.unlock;
	const name = (id: string) => DUNGEON_DEFS[id]?.name ?? id;
	const times = (n: number) => (n === 1 ? "" : ` ${n} times`);

	switch (rule.kind) {
		case "always":
			return "Available from the start";

		case "clears": {
			const parts = rule.requires.map(
				(r) => `${name(r.dungeonId)}${times(r.count)}`,
			);
			const list =
				parts.length > 1
					? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
					: parts[0];
			return `Clear ${list}`;
		}

		case "allOfTier":
			return `Clear every other tier-${rule.tier} dungeon${times(rule.count)}`;
	}
}

/** What one level of a crypt track is worth, e.g. "+8% per level". */
export function describeCryptTrack(key: CryptKey): string {
	switch (key) {
		case "squadSize":
			return `+${SQUAD_SIZE_PER_LEVEL} max squad size per level`;
		case "travelSpeed":
			return `+${pct(TRAVEL_SPEED_PER_LEVEL)} travel & return speed per level`;
	}
}

/** A crypt track's total at `level`, as the Workshop row displays it. */
export function describeCryptLevel(key: CryptKey, level: number): string {
	switch (key) {
		case "squadSize":
			return `+${level * SQUAD_SIZE_PER_LEVEL}`;
		case "travelSpeed":
			return `+${pct(level * TRAVEL_SPEED_PER_LEVEL)}`;
	}
}
