import {
	BASE_MAX_SQUAD_SIZE,
	BASE_MAX_SQUADS,
	MAX_ENEMY_PENALTY,
	MAX_PITY_REDUCTION,
} from "../data/economy";
import { TICKS_PER_SECOND } from "../data/pacing";
import { AFFIX_DEFS, BASE_UNLOCKED_SLOTS } from "../data/relics";
import { UNIT_STAT_CONFIG, UNIT_TYPES } from "../data/units";
import { UPGRADE_NODES } from "../data/upgrades";
import { TRAVEL_SPEED_PER_LEVEL } from "../data/workshop";
import type {
	AffixEffect,
	DerivedFlagKey,
	GameState,
	GlobalStatKey,
	Resources,
	SlotId,
	UnitDerivedStats,
	UnitType,
	UpgradeEffect,
	UpgradeNode,
} from "../types";
import { allAffixes, relicUpgradeMultiplier } from "./relics";
import { canAffordCost } from "./resources";
import { gardenTotalYield, squadSizeFromLevel, statAtLevel } from "./workshop";

export { UPGRADE_NODES };

/**
 * An upgrade node's price. A repeatable node multiplies it by `repeatGrowth`
 * once per purchase already made.
 */
export function upgradeCost(
	node: UpgradeNode,
	timesBought = 0,
): Partial<Resources> {
	if (!node.repeatGrowth || timesBought === 0) return node.cost;
	const scale = node.repeatGrowth ** timesBought;
	const out: Partial<Resources> = {};
	for (const [key, amount] of Object.entries(node.cost)) {
		out[key as keyof Resources] = Math.ceil(amount * scale);
	}
	return out;
}

export function upgradeTimesBought(state: GameState, nodeId: string): number {
	const owned = state.upgrades.purchased.includes(nodeId) ? 1 : 0;
	return owned + (state.upgrades.repeats?.[nodeId] ?? 0);
}

type Globals = Record<GlobalStatKey, number>;
type Flags = Record<DerivedFlagKey, boolean>;
type UnitStats = Record<UnitType, UnitDerivedStats>;

function baseGlobals(): Globals {
	return {
		bonesPassiveMult: 1,
		boneYieldBonus: 0,
		soulsYieldBonus: 0,
		corpseYieldBonus: 0,
		maxSquadSize: BASE_MAX_SQUAD_SIZE,
		maxSquads: BASE_MAX_SQUADS,
		soulHarvestBonus: 0,
		squadTravelSpeedBonus: 0,
		summonCostBonus: 0,
		bannerChanceBonus: 0,
		clearMultBonus: 0,
		reanimateChance: 0,
		groupTacticsBonus: 0,
		enemyHpPenalty: 0,
		enemyDmgPenalty: 0,
		pityReduction: 0,
	};
}

function baseUnitStats(): UnitStats {
	const stats = {} as UnitStats;
	for (const type of UNIT_TYPES) {
		stats[type] = {
			hpFlat: 0,
			hpBonus: 0,
			dmgFlat: 0,
			dmgBonus: 0,
			speedFlat: 0,
			speedBonus: 0,
			lifesteal: 0,
			regen: 0,
			berserk: 0,
			revive: 0,
			vanguard: 0,
			overwhelm: 0,
			executioner: 0,
			spectral: 0,
			lastStand: 0,
		};
	}
	return stats;
}

function applyGlobal(
	g: Globals,
	stat: GlobalStatKey,
	op: "add" | "mult" | "pctOfSelf",
	value: number,
): void {
	switch (op) {
		case "add":
			g[stat] += value;
			break;
		case "mult":
			g[stat] *= value;
			break;
		case "pctOfSelf":
			// A share of the stat's running total, so relics fold in last, after
			// upgrades and workshop levels have settled.
			g[stat] += Math.floor(g[stat] * value);
			break;
	}
}

function applyUpgradeEffect(
	effect: UpgradeEffect,
	g: Globals,
	units: UnitStats,
	flags: Flags,
	slots: Set<SlotId>,
): void {
	switch (effect.kind) {
		case "global":
			applyGlobal(g, effect.stat, effect.op, effect.value);
			break;
		case "unit":
			for (const type of effect.units) units[type][effect.stat] += effect.value;
			break;
		case "flag":
			flags[effect.flag] = true;
			break;
		case "slot":
			slots.add(effect.slot);
			break;
	}
}

/** `value` is the rolled affix magnitude, converted to a decimal but unscaled. */
function applyAffixEffect(
	effect: AffixEffect,
	value: number,
	g: Globals,
	units: UnitStats,
): void {
	switch (effect.kind) {
		case "global":
			applyGlobal(g, effect.stat, effect.op, value * (effect.scale ?? 1));
			break;
		case "unit": {
			const scaled = value * (effect.scale ?? 1);
			for (const type of effect.units) units[type][effect.stat] += scaled;
			break;
		}
	}
}

const NODES_BY_ID = new Map(UPGRADE_NODES.map((n) => [n.id, n]));

/**
 * Projects upgrades purchased, workshop levels and equipped relic affixes into
 * the flat numbers everything else reads. The fold order matters: `pctOfSelf`
 * takes a share of the running total, so relics must see a settled base.
 */
export function recomputeDerived(state: GameState): GameState["derived"] {
	const g = baseGlobals();
	const units = baseUnitStats();
	const flags: Flags = {
		zombiesUnlocked: false,
		wraithsUnlocked: false,
		corpsesUnlocked: false,
		soulsUnlocked: false,
		autoDeploy: false,
		phylactery: false,
	};
	const slots = new Set<SlotId>(BASE_UNLOCKED_SLOTS);

	// Purchased upgrade nodes
	for (const nodeId of state.upgrades.purchased) {
		const node = NODES_BY_ID.get(nodeId);
		if (!node) continue;
		// A repeatable node applies once per purchase; every other node once.
		const times = node.repeatGrowth
			? 1 + (state.upgrades.repeats?.[nodeId] ?? 0)
			: 1;
		for (let i = 0; i < times; i++) {
			for (const effect of node.effects) {
				applyUpgradeEffect(effect, g, units, flags, slots);
			}
		}
	}

	// Workshop levels
	let gardenBonesPerTick = 0;
	if (state.workshop) {
		const ws = state.workshop;
		for (const type of UNIT_TYPES) {
			const cfg = UNIT_STAT_CONFIG[type];
			units[type].hpFlat += statAtLevel(cfg.hp, ws[type].hp);
			units[type].dmgFlat += statAtLevel(cfg.dmg, ws[type].dmg);
			units[type].speedFlat += statAtLevel(cfg.speed, ws[type].speed);
		}
		g.maxSquadSize += squadSizeFromLevel(ws.crypt.squadSize);
		g.squadTravelSpeedBonus += ws.crypt.travelSpeed * TRAVEL_SPEED_PER_LEVEL;

		gardenBonesPerTick = gardenTotalYield(ws.garden) / TICKS_PER_SECOND;
	}

	// Equipped relic affixes
	for (const relicId of Object.values(state.relics.equipped)) {
		if (!relicId) continue;
		const relic = state.relics.inventory.find((r) => r.id === relicId);
		if (!relic) continue;

		const upgradeMultiplier = relicUpgradeMultiplier(relic.upgradeLevel);
		for (const affix of allAffixes(relic)) {
			const def = AFFIX_DEFS[affix.id];
			if (!def) continue;
			// Affix values are percentages; every consumer wants a decimal.
			const value = (affix.value * upgradeMultiplier) / 100;
			for (const effect of def.effects) {
				applyAffixEffect(effect, value, g, units);
			}
		}
	}

	// Clamped so a stacked debuff build can't erase a dungeon outright.
	g.enemyHpPenalty = Math.min(MAX_ENEMY_PENALTY, g.enemyHpPenalty);
	g.enemyDmgPenalty = Math.min(MAX_ENEMY_PENALTY, g.enemyDmgPenalty);
	g.pityReduction = Math.min(MAX_PITY_REDUCTION, g.pityReduction);

	const { bonesPassiveMult, ...globals } = g;

	return {
		...globals,
		...flags,
		...units,
		bonesPerTick: gardenBonesPerTick * bonesPassiveMult,
		unlockedSlots: [...slots],
		// Fixed, so catchup and the live loop convert sim time the same way.
		combatSpeedMultiplier: 1,
	};
}

export function canPurchaseUpgrade(state: GameState, nodeId: string): boolean {
	const node = NODES_BY_ID.get(nodeId);
	if (!node) return false;
	const bought = upgradeTimesBought(state, nodeId);
	if (bought > 0 && !node.repeatGrowth) return false;
	if (!canAffordCost(upgradeCost(node, bought), state.resources)) return false;
	for (const prereq of node.prerequisites) {
		if (!state.upgrades.purchased.includes(prereq)) return false;
	}
	return true;
}
