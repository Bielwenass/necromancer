export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type UnitType = 'skeleton' | 'zombie' | 'wraith';
export type SquadState = 'idle' | 'traveling' | 'fighting' | 'returning';
export type SlotId = 'C1' | 'C2' | 'C3' | 'I1' | 'I2' | 'II1' | 'II2' | 'III1' | 'III2';
export type PoolId = 'bone' | 'soul' | 'forbidden';

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
  slot: 'crypt' | 'skeleton' | 'zombie' | 'wraith';
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
  winner: 'a' | 'b' | 'draw';
  survivorsByType: Record<string, number>;
};

export interface Squad {
  id: string;
  name: string;
  composition: Record<UnitType, number>;
  currentHp: Record<UnitType, number>;
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
  enemies: EnemyDef[],
  lootTable: { bonesMin: number; bonesMax: number; coinsMin: number; coinsMax: number; soulChance: number; corpseMin: number; corpseMax: number };
  travelTimeTicks: number;
  unlockCondition: string | null;
  kind: 'ruin' | 'tower' | 'skull';
}


export interface DungeonState {
  id: string;
  clearCount: number;
  unlocked: boolean;
}

export interface UpgradeNode {
  id: string;
  branch: 'summoning' | 'command' | 'necromancy';
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

export interface PullRecord {
  relicId: string;
  relicName: string;
  rarity: Rarity;
  poolId: PoolId;
  glyph: string;
  tickCount: number;
}

export interface SurgeState {
  cooldownTicks: number;
  charges: number;
  activeBuff: 'yield' | 'speed' | 'damage' | null;
  buffTicksRemaining: number;
}

export interface Resources {
  bones: number;
  coins: number;
  souls: number;
  dust: number;
  corpses: number;
}

export interface Units {
  skeletons: number;
  zombies: number;
  wraiths: number;
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
  surge: SurgeState;
  gacha: {
    pityCounters: Record<PoolId, number>;
    pullHistory: PullRecord[];
    sessionTotals: Record<Rarity, number>;
    lastPulledRelics: Relic[] | null;
  };
  meta: {
    tickCount: number;
    dayCount: number;
    version: number;
  };
  derived: {
    bonesPerTick: number;
    coinsPerTick: number;
    soulsPerTick: number;
    maxSquadSize: number;
    maxActiveSquads: number;
    zombiesUnlocked: boolean;
    wraithsUnlocked: boolean;
    autoDeploy: boolean;
    boneSurgeActive: boolean;
    soulHarvestBonus: number;
    dropRateBonus: number;
    rarityBoostActive: boolean;
    surgeYieldMultiplier: number;
    surgeSpeedMultiplier: number;
    surgeDamageMultiplier: number;
    skeletonDamageBonus: number;
    skeletonHpBonus: number;
    zombieDamageBonus: number;
    zombieHpBonus: number;
    wraithDamageBonus: number;
    wraithHpBonus: number;
    squadReturnSpeedBonus: number;
    summonCostBonus: number;
    combatSpeedMultiplier: number;
  };
}
