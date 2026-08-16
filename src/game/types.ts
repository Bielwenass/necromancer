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
	signatureAffixId?: string;
	glyph: string;
	description: string;
}

/** A scalar `recomputeDerived` accumulates. */
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
	| { kind: "slot"; slot: SlotId };

/**
 * Where a relic affix's rolled value lands. Values are percentages as a decimal,
 * multiplied by `scale`; a negative `scale` makes a trade-off affix.
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
	  };

export type SquadComposition = Record<UnitType, number>;

export type CombatOutcome = {
	winner: "a" | "b" | "draw";
	survivorsByType: SquadComposition;
};

export interface Squad {
	id: string;
	name: string;
	composition: SquadComposition;
	/** The strength the squad was raised at; only `replenishSquad` refills to it. */
	roster: SquadComposition;
	targetDungeonId: string | null;
	state: SquadState;
	/**
	 * The phase's bounds, in absolute `meta.tickCount`. Both absent when idle;
	 * `phaseEndTick` also absent while `fighting`, a fight ending when it is
	 * decided. Absolute deadlines give "who transitions at tick T" one answer.
	 */
	phaseStartTick?: number;
	phaseEndTick?: number;
	pendingLoot: Partial<Resources> | null;
	fightSeed?: number;
	manualRecall?: boolean;
}

export type EnemyDef = {
	name: string;
	amount: number;
	color: string;
	stats: { hp: number; dmg: number; speed: number };
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
	unlockCondition: { dungeonId: string; count: number }[];
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
	/** Qualitative colour only; `describeUpgradeEffects` states the magnitudes. */
	description?: string;
	flavor?: string;
	tier: number;
	cost: Partial<Resources>;
	effects: UpgradeEffect[];

	prerequisites: string[];
	icon: string;
	capstone?: boolean;
	/** Buyable repeatedly: price × this per purchase, effects once each. */
	repeatGrowth?: number;
}

export type GardenPlotId = Exclude<keyof Resources, "banners">;

export interface Resources {
	bones: number;
	souls: number;
	dust: number;
	corpses: number;
	banners: number;
}

export interface WorkshopState {
	skeleton: { hp: number; dmg: number; speed: number };
	zombie: { hp: number; dmg: number; speed: number };
	wraith: { hp: number; dmg: number; speed: number };
	crypt: { squadSize: number; travelSpeed: number };
	garden: Record<GardenPlotId, number>;
}

export type Units = Record<UnitType, number>;

/**
 * Everything a unit type is worth in a fight. The first six are the stat line: a
 * flat workshop value raised by a percentage from upgrades and relics. The rest
 * are combat modifiers read per unit by the simulation; zero is the common case
 * the hot loop is optimised for.
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
	/** Damage bonus at zero HP, scaling with HP missing. */
	berserk: number;
	/** Share of max HP a unit returns at, once, in place of dying. */
	revive: number;
	/** Damage bonus during the opening seconds of a fight. */
	vanguard: number;
	/** Share of the unit's damage dealt per second to every enemy in reach. */
	aura: number;
	/** Damage bonus per unit of local numerical advantage. */
	overwhelm: number;
	/** Damage bonus against a low-HP target, scaling with HP missing. */
	executioner: number;
	/** Damage bonus against a high-HP target, scaling with HP remaining. */
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
		repeats?: Record<string, number>;
	};
	gacha: {
		pityCounters: Record<PoolId, number>;
		lastPulledRelics: Relic[] | null;
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
		boneYieldBonus: number;
		/** Multiplies souls on deposit; the drop chance is untouched. */
		soulsYieldBonus: number;
		/** Multiplies corpses on deposit; the per-kill drop chance is flat. */
		corpseYieldBonus: number;
		maxSquadSize: number;
		maxSquads: number;
		zombiesUnlocked: boolean;
		wraithsUnlocked: boolean;
		/** Whether a clear drops the resource at all. Both start closed. */
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
		/** Relic slots opened past those open from the start. */
		unlockedSlots: SlotId[];

		skeleton: UnitDerivedStats;
		zombie: UnitDerivedStats;
		wraith: UnitDerivedStats;

		squadTravelSpeedBonus: number;
		summonCostBonus: number;
		combatSpeedMultiplier: number;
	};
}
