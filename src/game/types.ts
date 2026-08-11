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
export type PoolId = "bone" | "soul" | "forbidden";

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
	slot: "crypt" | "skeleton" | "zombie" | "wraith";
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
		corpseMin: number;
		corpseMax: number;
	};
	travelTimeTicks: number;
	unlockCondition: string | null;
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
	description: string;
	flavor?: string;
	tier: number;
	cost: number;
	prerequisites: string[];
	unlocks: string[];
	icon: string;
	x: number;
	y: number;
	capstone?: boolean;
}

/** A garden plot is identified by the resource that buys it. */
export type GardenPlotId = keyof Resources;

export interface Resources {
	bones: number;
	coins: number;
	souls: number;
	dust: number;
	corpses: number;
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
		availablePoints: number;
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
		 * Accumulated from the `corpseYield` affix and the `n3a` upgrade, but not
		 * yet applied to loot anywhere — corpse drops currently ignore it.
		 */
		corpseYieldBonus: number;
		maxSquadSize: number;
		maxActiveSquads: number;
		zombiesUnlocked: boolean;
		wraithsUnlocked: boolean;
		autoDeploy: boolean;
		boneSurgeActive: boolean;
		soulHarvestBonus: number;
		rarityBoostActive: boolean;

		skeleton: UnitDerivedStats;
		zombie: UnitDerivedStats;
		wraith: UnitDerivedStats;

		squadTravelSpeedBonus: number;
		summonCostBonus: number;
		combatSpeedMultiplier: number;
	};
}
