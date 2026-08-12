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
	uniqueAffix?: string;
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
	| "coinYieldBonus"
	| "soulsYieldBonus"
	| "corpseYieldBonus"
	| "maxSquadSize"
	| "maxSquads"
	| "soulHarvestBonus"
	| "squadTravelSpeedBonus"
	| "summonCostBonus";

export type UnitStatKey = keyof UnitDerivedStats;

export type DerivedFlagKey =
	| "zombiesUnlocked"
	| "wraithsUnlocked"
	| "autoDeploy";

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
	| ElsewhereEffect;

/**
 * Where a relic affix's *rolled* value lands. Unlike an upgrade effect, the
 * magnitude isn't in the data — it comes off the roll — so this declares only
 * the target. Affix values are percentages, converted to a decimal before
 * being applied; `scale` multiplies that decimal for affixes whose stat is not
 * a straight one-to-one (`soulOnKill` counts double).
 */
export type AffixEffect =
	| {
			kind: "global";
			stat: GlobalStatKey;
			op: "add" | "pctOfSelf";
			scale?: number;
	  }
	| { kind: "unit"; units: readonly UnitType[]; stat: UnitStatKey }
	| ElsewhereEffect;

export type CombatOutcome = {
	winner: "a" | "b" | "draw";
	survivorsByType: Record<string, number>;
};

export interface Squad {
	id: string;
	name: string;
	composition: Record<UnitType, number>;
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
		coinsMin: number;
		coinsMax: number;
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
	cost: number;
	/** Every node carries at least one, `elsewhere` included. */
	effects: UpgradeEffect[];
	prerequisites: string[];
	unlocks: string[];
	icon: string;
	capstone?: boolean;
}

/**
 * A garden plot is identified by the resource that buys it. Banners are
 * excluded because they are earned by clearing dungeons, not farmed; coins
 * because they are retired and buy nothing.
 */
export type GardenPlotId = Exclude<keyof Resources, "banners" | "coins">;

export interface Resources {
	bones: number;
	/**
	 * **Retired.** Dungeons roll coins into `pendingLoot` and the deposit banks
	 * them, but nothing displays or spends them — no ritual, no garden plot, no
	 * top-bar readout. The field and its loot-table columns are kept so old saves
	 * stay valid and a future sink can adopt them.
	 */
	coins: number;
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

export interface UnitDerivedStats {
	hpFlat: number;
	hpBonus: number;
	dmgFlat: number;
	dmgBonus: number;
	speedFlat: number;
	speedBonus: number;
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
		coinsPerTick: number;
		soulsPerTick: number;
		boneYieldBonus: number;
		coinYieldBonus: number;
		soulsYieldBonus: number;
		/**
		 * From the `corpseYield` affix and the `n3a` upgrade. Multiplies corpses
		 * on loot deposit, like the other yield bonuses — the per-kill drop
		 * chance itself is flat.
		 */
		corpseYieldBonus: number;
		maxSquadSize: number;
		maxSquads: number;
		zombiesUnlocked: boolean;
		wraithsUnlocked: boolean;
		autoDeploy: boolean;
		soulHarvestBonus: number;

		skeleton: UnitDerivedStats;
		zombie: UnitDerivedStats;
		wraith: UnitDerivedStats;

		squadTravelSpeedBonus: number;
		summonCostBonus: number;
		combatSpeedMultiplier: number;
	};
}
