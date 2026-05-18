import type { Resources } from './types';

export const UNIT_STAT_CONFIG = {
  skeleton: {
    hp:    { baseBones: 50,  growth: 1.22, perLevel: 2,    label: 'HP',    base: 10  },
    dmg:   { baseBones: 80,  growth: 1.25, perLevel: 1,    label: 'DMG',   base: 3   },
    speed: { baseBones: 200, growth: 1.30, perLevel: 0.05, label: 'Speed', base: 1.0 },
  },
  zombie: {
    hp:    { baseBones: 120, growth: 1.22, perLevel: 5,    label: 'HP',    base: 25  },
    dmg:   { baseBones: 100, growth: 1.25, perLevel: 1,    label: 'DMG',   base: 4   },
    speed: { baseBones: 300, growth: 1.30, perLevel: 0.04, label: 'Speed', base: 0.6 },
  },
  wraith: {
    hp:    { baseBones: 80,  growth: 1.24, perLevel: 1,    label: 'HP',    base: 6   },
    dmg:   { baseBones: 150, growth: 1.25, perLevel: 2,    label: 'DMG',   base: 8   },
    speed: { baseBones: 400, growth: 1.30, perLevel: 0.07, label: 'Speed', base: 1.5 },
  },
} as const;

export const CRYPT_CONFIG = {
  squadSize:   { baseBones: 150, growth: 1.25, label: '+1 max squad size per level'   },
  travelSpeed: { baseBones: 100, growth: 1.35, label: '+8% travel & return speed per level' },
} as const;

export const GARDEN_PLOT_NAMES = [
  'Ossuary Row', 'Pauper Trench', 'Ash Bed', 'Bone Midden', 'Ruin Garden', 'Catacomb Plot',
];

export const GARDEN_BASE_YIELD = 0.1; // bones/sec per level

export type UnitKey = 'skeleton' | 'zombie' | 'wraith';
export type StatKey = 'hp' | 'dmg' | 'speed';
export type CryptKey = 'squadSize' | 'travelSpeed';

export function unitStatCost(unit: UnitKey, stat: StatKey, level: number): Partial<Resources> {
  const cfg = UNIT_STAT_CONFIG[unit][stat];
  const bones = Math.floor(cfg.baseBones * Math.pow(cfg.growth, level));
  const cost: Partial<Resources> = { bones };
  if (level >= 5)  cost.corpses = Math.max(1, Math.floor(bones * 0.10));
  if (level >= 15) cost.souls   = Math.floor(level / 5);
  if (unit === 'wraith' && level >= 3) {
    cost.souls = Math.max(cost.souls ?? 0, Math.floor(level / 3));
  }
  return cost;
}

export function cryptCost(key: CryptKey, level: number): Partial<Resources> {
  const cfg = CRYPT_CONFIG[key];
  return { bones: Math.floor(cfg.baseBones * Math.pow(cfg.growth, level)) };
}

export function gardenCost(level: number): Partial<Resources> {
  if (level === 0) return { coins: 100 };
  return { bones: Math.floor(30 * Math.pow(1.35, level)) };
}

export function canAffordCost(cost: Partial<Resources>, res: Resources): boolean {
  return (
    (cost.bones   ?? 0) <= res.bones   &&
    (cost.coins   ?? 0) <= res.coins   &&
    (cost.souls   ?? 0) <= res.souls   &&
    (cost.corpses ?? 0) <= res.corpses
  );
}

export function applyCost(cost: Partial<Resources>, res: Resources): Resources {
  return {
    ...res,
    bones:   res.bones   - (cost.bones   ?? 0),
    coins:   res.coins   - (cost.coins   ?? 0),
    souls:   res.souls   - (cost.souls   ?? 0),
    corpses: res.corpses - (cost.corpses ?? 0),
  };
}
