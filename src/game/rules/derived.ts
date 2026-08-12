import { BASE_MAX_SQUAD_SIZE, BASE_MAX_SQUADS } from "../data/economy";
import { TICKS_PER_SECOND } from "../data/pacing";
import { AFFIX_DEFS } from "../data/relics";
import { UNIT_STAT_CONFIG, UNIT_TYPES } from "../data/units";
import { UPGRADE_NODES } from "../data/upgrades";
import { SQUAD_SIZE_PER_LEVEL, TRAVEL_SPEED_PER_LEVEL } from "../data/workshop";
import type {
	AffixEffect,
	DerivedFlagKey,
	GameState,
	GlobalStatKey,
	Resources,
	UnitDerivedStats,
	UnitType,
	UpgradeEffect,
	UpgradeNode,
} from "../types";
import { relicUpgradeMultiplier } from "./relics";
import { canAffordCost } from "./resources";
import { gardenTotalYield } from "./workshop";

export { UPGRADE_NODES };

/**
 * An upgrade node's price, in the same `Partial<Resources>` shape every other
 * purchase in the game uses. Nodes are banner-only today; keeping the cost a
 * resource map means a node could charge souls or bones without a new code path.
 */
export function upgradeCost(node: UpgradeNode): Partial<Resources> {
	return { banners: node.cost };
}

type Globals = Record<GlobalStatKey, number>;
type Flags = Record<DerivedFlagKey, boolean>;
type UnitStats = Record<UnitType, UnitDerivedStats>;

function baseGlobals(): Globals {
	return {
		bonesPassiveMult: 1,
		boneYieldBonus: 0,
		coinYieldBonus: 0,
		soulsYieldBonus: 0,
		corpseYieldBonus: 0,
		maxSquadSize: BASE_MAX_SQUAD_SIZE,
		maxSquads: BASE_MAX_SQUADS,
		soulHarvestBonus: 0,
		squadTravelSpeedBonus: 0,
		summonCostBonus: 0,
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
			// A share of the stat's own running total — how a percentage squad-size
			// bonus has to work. Order-sensitive by nature, which is why relics are
			// folded in last, after upgrades and workshop levels have settled.
			g[stat] += Math.floor(g[stat] * value);
			break;
	}
}

function applyUpgradeEffect(
	effect: UpgradeEffect,
	g: Globals,
	units: UnitStats,
	flags: Flags,
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
		case "elsewhere":
			// Owned by the combat engine, or not built yet — nothing to fold in.
			break;
	}
}

/** `value` is the rolled affix magnitude, already scaled and converted to a decimal. */
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
		case "unit":
			for (const type of effect.units) units[type][effect.stat] += value;
			break;
		case "elsewhere":
			break;
	}
}

const NODES_BY_ID = new Map(UPGRADE_NODES.map((n) => [n.id, n]));

/**
 * The single computed projection of *upgrades purchased + workshop levels +
 * equipped relic affixes* into the flat numbers everything else reads.
 *
 * The three sources are folded in that order and it matters: `pctOfSelf`
 * effects (the `squadSizeBonus` affix) take a share of the running total, so
 * relics must see a settled base.
 */
export function recomputeDerived(state: GameState): GameState["derived"] {
	const g = baseGlobals();
	const units = baseUnitStats();
	const flags: Flags = {
		zombiesUnlocked: false,
		wraithsUnlocked: false,
		autoDeploy: false,
	};

	// ── 1. Purchased upgrade nodes ───────────────────────────────
	for (const nodeId of state.upgrades.purchased) {
		const node = NODES_BY_ID.get(nodeId);
		if (!node) continue;
		for (const effect of node.effects) {
			applyUpgradeEffect(effect, g, units, flags);
		}
	}

	// ── 2. Workshop levels ───────────────────────────────────────
	let gardenBonesPerTick = 0;
	if (state.workshop) {
		const ws = state.workshop;
		for (const type of UNIT_TYPES) {
			const cfg = UNIT_STAT_CONFIG[type];
			units[type].hpFlat += cfg.hp.base + ws[type].hp * cfg.hp.perLevel;
			units[type].dmgFlat += cfg.dmg.base + ws[type].dmg * cfg.dmg.perLevel;
			units[type].speedFlat +=
				cfg.speed.base + ws[type].speed * cfg.speed.perLevel;
		}
		g.maxSquadSize += ws.crypt.squadSize * SQUAD_SIZE_PER_LEVEL;
		g.squadTravelSpeedBonus += ws.crypt.travelSpeed * TRAVEL_SPEED_PER_LEVEL;

		gardenBonesPerTick = gardenTotalYield(ws.garden) / TICKS_PER_SECOND;
	}

	// ── 3. Equipped relic affixes ────────────────────────────────
	for (const relicId of Object.values(state.relics.equipped)) {
		if (!relicId) continue;
		const relic = state.relics.inventory.find((r) => r.id === relicId);
		if (!relic) continue;

		const upgradeMultiplier = relicUpgradeMultiplier(relic.upgradeLevel);
		const apply = (affixId: string, rolled: number) => {
			const def = AFFIX_DEFS[affixId];
			if (!def) return;
			// Affix values are percentages; every consumer wants a decimal.
			applyAffixEffect(
				def.effect,
				(rolled * upgradeMultiplier) / 100,
				g,
				units,
			);
		};

		apply(relic.mainAffix.id, relic.mainAffix.value);
		for (const minor of relic.minorAffixes) apply(minor.id, minor.value);
	}

	return {
		bonesPerTick: gardenBonesPerTick * g.bonesPassiveMult,
		coinsPerTick: 0,
		soulsPerTick: 0,
		boneYieldBonus: g.boneYieldBonus,
		coinYieldBonus: g.coinYieldBonus,
		soulsYieldBonus: g.soulsYieldBonus,
		corpseYieldBonus: g.corpseYieldBonus,
		maxSquadSize: g.maxSquadSize,
		maxSquads: g.maxSquads,
		zombiesUnlocked: flags.zombiesUnlocked,
		wraithsUnlocked: flags.wraithsUnlocked,
		autoDeploy: flags.autoDeploy,
		soulHarvestBonus: g.soulHarvestBonus,

		skeleton: units.skeleton,
		zombie: units.zombie,
		wraith: units.wraith,

		squadTravelSpeedBonus: g.squadTravelSpeedBonus,
		summonCostBonus: g.summonCostBonus,
		// Nothing varies this yet; it exists so catchup and the live loop agree on
		// how sim time converts to wall-clock time.
		combatSpeedMultiplier: 1,
	};
}

export function canPurchaseUpgrade(state: GameState, nodeId: string): boolean {
	const node = NODES_BY_ID.get(nodeId);
	if (!node) return false;
	if (state.upgrades.purchased.includes(nodeId)) return false;
	if (!canAffordCost(upgradeCost(node), state.resources)) return false;
	for (const prereq of node.prerequisites) {
		if (!state.upgrades.purchased.includes(prereq)) return false;
	}
	return true;
}
