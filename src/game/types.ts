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
	 * the rarity that affix demands. The only route to a gated affix, which every
	 * minor pool filters out.
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
	 * The affix this base awakens at high rarity. Its own `minRarity` decides
	 * which rarities get it, so the gate isn't restated per base.
	 */
	signatureAffixId?: string;
	glyph: string;
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
	| { kind: "slot"; slot: SlotId };

/**
 * Where a relic affix's *rolled* value lands — only the target, since the
 * magnitude comes off the roll. Affix values are percentages converted to a
 * decimal; `scale` multiplies that decimal, which is what makes a trade-off
 * affix possible: one roll, a positive effect at full scale and a negative one
 * at a fraction of it.
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
	/**
	 * The current phase's bounds, in absolute `meta.tickCount`. Both absent for an
	 * idle squad; `phaseEndTick` is also absent while `fighting`, since a fight
	 * ends when it is decided rather than on a clock.
	 *
	 * Deadlines rather than a 0-1 fraction so "which squads transition at tick T"
	 * has one answer. UI travel progress is derived from these.
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
	/**
	 * Qualitative flavour only — the mechanical line is generated from `effects`
	 * by `describeUpgradeEffects`, so magnitudes must never be restated here.
	 */
	description?: string;
	flavor?: string;
	tier: number;
	cost: Partial<Resources>;
	effects: UpgradeEffect[];

	// Ids that must already be purchased.
	prerequisites: string[];
	icon: string;
	capstone?: boolean;
	/**
	 * Present on a node that can be bought over and over, its price multiplied by
	 * this each time and its effects applied once per purchase.
	 */
	repeatGrowth?: number;
}

/** A garden plot is identified by the resource that buys it. */
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
	/** Plot level keyed by the resource that buys it; 0 = not purchased. */
	garden: Record<GardenPlotId, number>;
}

export type Units = Record<UnitType, number>;

/**
 * Everything a unit type is worth in a fight. The first six are the stat line —
 * a flat value from the workshop raised by a percentage from upgrades and
 * relics. The rest are *combat modifiers*, read per unit by the simulation and
 * inert outside a fight. Each is a fraction, and zero — "this unit doesn't have
 * it" — is the common case the hot loop is optimised for.
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
		/** Times each `repeatGrowth` node has been bought, past the first. */
		repeats?: Record<string, number>;
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
		boneYieldBonus: number;
		/** Added to the souls banked per drop, rather than to the drop chance. */
		soulsYieldBonus: number;
		/**
		 * Multiplies corpses on deposit like the other yield bonuses; the per-kill
		 * drop chance itself is flat.
		 */
		corpseYieldBonus: number;
		maxSquadSize: number;
		maxSquads: number;
		zombiesUnlocked: boolean;
		wraithsUnlocked: boolean;
		/**
		 * Whether a clear drops the resource at all. Both start closed — the early
		 * tree opens them, so a new necromancer banks bones and banners only.
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
