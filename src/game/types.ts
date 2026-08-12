export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type UnitType = "skeleton" | "zombie" | "wraith";
export type SquadState = "idle" | "traveling" | "fighting" | "returning";
export type SlotId =
	| "C1"
	| "C2"
	| "C3"
	| "I1"
	| "I2"
	| "II1"
	| "II2"
	| "III1"
	| "III2";
export type PoolId = "banner" | "carrion" | "forbidden";
/** Which family of slots a relic base belongs to — the crypt or one unit type. */
export type RelicSlotType = "crypt" | UnitType;

export interface Affix {
	id: string;
	value: number;
	rollPosition: number; // 0-1
}

export interface Relic {
	id: string;
	baseId: string;
	rarity: Rarity;
	mainAffix: Affix;
	minorAffixes: Affix[];
	/**
	 * The base's signature power, present only when the relic rolled at or above
	 * the rarity that affix demands. This is the only way a gated affix reaches a
	 * relic — they are filtered out of every minor pool.
	 */
	uniqueAffix?: Affix;
	upgradeLevel: number; // 0-5
	duplicateCount: number;
	quality: number; // 0-100, derived
	isNew?: boolean;
}

export interface RelicBase {
	id: string;
	name: string;
	slot: RelicSlotType;
	slotIds: SlotId[];
	mainAffixId: string;
	mainAffixRange: [number, number];
	minorAffixPool: string[];
	/**
	 * The affix this base awakens at high rarity. Its `minRarity` decides which
	 * rarities get it, so the gate lives with the affix rather than being
	 * restated per base.
	 */
	signatureAffixId?: string;
	glyph: string;
	set?: string;
	description: string;
}

export interface AffixDef {
	id: string;
	label: string;
	unit: string; // '%' or '' for flat
	range: [number, number];
}

/**
 * A scalar `recomputeDerived` accumulates. `bonesPassiveMult` is internal — it
 * multiplies the garden's output into `bonesPerTick` rather than surviving into
 * `derived` under its own name.
 */
export type GlobalStatKey =
	| "bonesPassiveMult"
	| "boneYieldBonus"
	| "soulsYieldBonus"
	| "corpseYieldBonus"
	| "maxSquadSize"
	| "maxSquads"
	| "soulHarvestBonus"
	| "squadTravelSpeedBonus"
	| "summonCostBonus"
	| "bannerChanceBonus"
	| "clearMultBonus"
	| "reanimateChance"
	| "groupTacticsBonus"
	| "enemyHpPenalty"
	| "enemyDmgPenalty"
	| "pityReduction";

export type UnitStatKey = keyof UnitDerivedStats;

export type DerivedFlagKey =
	| "zombiesUnlocked"
	| "wraithsUnlocked"
	| "corpsesUnlocked"
	| "soulsUnlocked"
	| "autoDeploy"
	| "phylactery";

/**
 * Where an effect that `recomputeDerived` can't apply actually lives. An effect
 * the combat engine owns, or one that isn't built yet, still has to declare
 * itself, so the data tables stay auditable on their own.
 */
export type ElsewhereEffect = {
	kind: "elsewhere";
	where: "combat" | "tick" | "gacha" | "unimplemented";
	note: string;
};

/**
 * A fixed effect declared by an upgrade node. `pctOfSelf` raises a stat by a
 * share of its own running value, which is how a percentage squad-size bonus
 * has to work.
 */
export type UpgradeEffect =
	| {
			kind: "global";
			stat: GlobalStatKey;
			op: "add" | "mult" | "pctOfSelf";
			value: number;
	  }
	| {
			kind: "unit";
			units: readonly UnitType[];
			stat: UnitStatKey;
			value: number;
	  }
	| { kind: "flag"; flag: DerivedFlagKey }
	| { kind: "slot"; slot: SlotId }
	| ElsewhereEffect;

/**
 * Where a relic affix's *rolled* value lands. Unlike an upgrade effect, the
 * magnitude isn't in the data — it comes off the roll — so this declares only
 * the target. Affix values are percentages, converted to a decimal before
 * being applied; `scale` multiplies that decimal, which is what makes a
 * trade-off affix possible: one roll, a positive effect at full scale and a
 * negative one at a fraction of it.
 */
export type AffixEffect =
	| {
			kind: "global";
			stat: GlobalStatKey;
			op: "add" | "pctOfSelf";
			scale?: number;
	  }
	| {
			kind: "unit";
			units: readonly UnitType[];
			stat: UnitStatKey;
			scale?: number;
	  }
	| ElsewhereEffect;

export type CombatOutcome = {
	winner: "a" | "b" | "draw";
	survivorsByType: Record<string, number>;
};

export interface Squad {
	id: string;
	name: string;
	composition: Record<UnitType, number>;
	/**
	 * The strength the squad was raised at. `composition` shrinks as units die;
	 * `replenishSquad` refills back up to this and nothing else writes it.
	 */
	roster: Record<UnitType, number>;
	targetDungeonId: string | null;
	state: SquadState;
	position: number; // 0-1 along route
	pendingLoot: Partial<Resources> | null;
	fightSeed?: number;
	fightStartWallTime?: number;
	manualRecall?: boolean;
}

export type EnemyDef = {
	name: string;
	amount: number;
	color: string;
	stats: { hp: number; dmg: number; speed: number };
};

/**
 * What opens a dungeon. This is the *live* gate: `checkUnlockConditions`
 * evaluates it and `describeUnlock` renders the sentence the player reads, so
 * the two can't disagree. `clears` requires every entry; `allOfTier` requires
 * `count` clears of every tier-N dungeon outside `except`.
 */
export type UnlockRule =
	| { kind: "always" }
	| { kind: "clears"; requires: { dungeonId: string; count: number }[] }
	| {
			kind: "allOfTier";
			tier: 1 | 2 | 3 | 4;
			except?: string[];
			count: number;
	  };

export interface DungeonDef {
	id: string;
	name: string;
	tier: 1 | 2 | 3 | 4;
	enemies: EnemyDef[];
	lootTable: {
		bonesMin: number;
		bonesMax: number;
		soulChance: number;
	};
	travelTimeTicks: number;
	unlock: UnlockRule;
	kind: "ruin" | "tower" | "skull";
}

export interface DungeonState {
	id: string;
	clearCount: number;
	unlocked: boolean;
}

export interface UpgradeNode {
	id: string;
	branch: "summoning" | "command" | "necromancy";
	name: string;
	/**
	 * Qualitative colour only — what the node is *for*. The mechanical line the
	 * player reads is generated from `effects` by `describeUpgradeEffects`, so
	 * magnitudes must never be restated here.
	 */
	description?: string;
	flavor?: string;
	tier: number;
	/**
	 * Priced like every other purchase in the game. Most nodes charge banners
	 * alone; the two that open a new unit type also charge the resource that unit
	 * will be summoned with, so the tree can't outrun the economy feeding it.
	 */
	cost: Partial<Resources>;
	/** Every node carries at least one, `elsewhere` included. */
	effects: UpgradeEffect[];
	/**
	 * Ids that must already be purchased. The only edge the tree has — a node
	 * with an unmet prerequisite is omitted from its branch rather than drawn
	 * locked, so a prerequisite naming a *different* branch's node reads as a
	 * node that simply isn't there. Reach across branches by charging that
	 * branch's resource in `cost` instead.
	 */
	prerequisites: string[];
	icon: string;
	capstone?: boolean;
}

/**
 * A garden plot is identified by the resource that buys it. Banners are
 * excluded because they are earned by clearing dungeons, not farmed.
 */
export type GardenPlotId = Exclude<keyof Resources, "banners">;

export interface Resources {
	bones: number;
	souls: number;
	dust: number;
	corpses: number;
	/**
	 * Awarded per dungeon clear (`def.tier` of them) and spent on upgrade-tree
	 * nodes. A normal resource in every respect — stored in `resources`, charged
	 * through `canAffordCost`/`applyCost`, priced in a `Partial<Resources>`.
	 */
	banners: number;
}

export interface WorkshopState {
	skeleton: { hp: number; dmg: number; speed: number };
	zombie: { hp: number; dmg: number; speed: number };
	wraith: { hp: number; dmg: number; speed: number };
	crypt: { squadSize: number; travelSpeed: number };
	/** Plot level keyed by the resource that buys it; 0 = not purchased. */
	garden: Record<GardenPlotId, number>;
}

export interface Units {
	skeletons: number;
	zombies: number;
	wraiths: number;
}

/**
 * Everything a unit type is worth in a fight.
 *
 * The first six are the stat line: a flat value from the workshop, raised by a
 * percentage from upgrades and relics. The rest are *combat modifiers* — the
 * simulation reads them per unit and they do nothing outside a fight. Every one
 * is a fraction; zero means "this unit doesn't have it", which is the common
 * case and the one the hot loop is optimised for.
 */
export interface UnitDerivedStats {
	hpFlat: number;
	hpBonus: number;
	dmgFlat: number;
	dmgBonus: number;
	speedFlat: number;
	speedBonus: number;

	/** Share of damage dealt returned to the attacker as HP. */
	lifesteal: number;
	/** Share of max HP regained per second of combat. */
	regen: number;
	/** Damage bonus at zero HP, scaling linearly with HP missing. */
	berserk: number;
	/** Share of max HP a unit returns at, once, instead of dying. */
	revive: number;
	/** Damage bonus during the opening seconds of a fight. */
	vanguard: number;
	/** Share of the unit's damage dealt per second to *every* enemy in reach. */
	aura: number;
	/** Damage bonus per unit of local numerical advantage. */
	overwhelm: number;
	/** Damage bonus against targets at low HP, scaling with HP missing. */
	executioner: number;
	/** Damage bonus against targets at high HP, scaling with HP remaining. */
	spectral: number;
	/** Damage bonus once the unit's own side is nearly wiped out. */
	lastStand: number;
}

export interface GameState {
	resources: Resources;
	units: Units;
	squads: Squad[];
	dungeons: DungeonState[];
	relics: {
		inventory: Relic[];
		equipped: Partial<Record<SlotId, string | null>>;
	};
	upgrades: {
		purchased: string[];
	};
	gacha: {
		pityCounters: Record<PoolId, number>;
		lastPulledRelics: Relic[] | null;
		/** Banner-pool pulls owed by the Phylactery, and progress toward the next. */
		freePulls: number;
		freePullTicks: number;
	};
	workshop: WorkshopState;
	meta: {
		tickCount: number;
		dayCount: number;
		version: number;
		lastTickAt: number;
	};
	derived: {
		bonesPerTick: number;
		soulsPerTick: number;
		boneYieldBonus: number;
		/** Added to the souls banked per drop, rather than to the drop chance. */
		soulsYieldBonus: number;
		/**
		 * From the `corpseYield` affix and the Resurrection upgrade. Multiplies
		 * corpses on loot deposit, like the other yield bonuses — the per-kill drop
		 * chance itself is flat.
		 */
		corpseYieldBonus: number;
		maxSquadSize: number;
		maxSquads: number;
		zombiesUnlocked: boolean;
		wraithsUnlocked: boolean;
		/**
		 * Whether a clear drops the resource at all. Both start closed: the early
		 * tree is what opens the corpse and soul economies, so a new necromancer
		 * banks bones and banners and nothing else.
		 */
		corpsesUnlocked: boolean;
		soulsUnlocked: boolean;
		autoDeploy: boolean;
		/** Grants periodic free banner-pool pulls. */
		phylactery: boolean;
		soulHarvestBonus: number;
		/** Chance a clear pays one banner beyond the dungeon's tier. */
		bannerChanceBonus: number;
		/** Steepens the repeat-clear payout curve. */
		clearMultBonus: number;
		/** Chance each unit lost on a clear walks home as a skeleton. */
		reanimateChance: number;
		/** Damage bonus while a squad fields all three unit types. */
		groupTacticsBonus: number;
		/** Shares taken off enemy HP and damage before a fight starts. */
		enemyHpPenalty: number;
		enemyDmgPenalty: number;
		/** Share taken off every Ritual pool's pity interval. */
		pityReduction: number;
		/** Relic slots the player has opened, beyond the ones open from the start. */
		unlockedSlots: SlotId[];

		skeleton: UnitDerivedStats;
		zombie: UnitDerivedStats;
		wraith: UnitDerivedStats;

		squadTravelSpeedBonus: number;
		summonCostBonus: number;
		combatSpeedMultiplier: number;
	};
}
