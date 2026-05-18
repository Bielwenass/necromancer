import type { DungeonDef } from '../types';

export const DUNGEON_DEFS: Record<string, DungeonDef> = {

  // ═══════════════════════════════════════════════════════════════
  // TIER 1 — Skirmish scale. Squad caps ~5–30. Day 1 of progression.
  // ═══════════════════════════════════════════════════════════════

  'paupers-tomb': {
    id: 'paupers-tomb',
    name: "Pauper's Tomb",
    tier: 1,
    enemies: [{
      name: 'wretch',
      amount: 5,
      color: '#8B6B5D',
      stats: { hp: 8, dmg: 4, speed: 0.8 }
    }],
    lootTable: { bonesMin: 15, bonesMax: 30, coinsMin: 3, coinsMax: 8, soulChance: 0.03, corpseMin: 3, corpseMax: 6 },
    travelTimeTicks: 60,
    unlockCondition: 'available from start',
    kind: 'skull',
  },

  'wolf-den': {
    id: 'wolf-den',
    name: 'Wolf Den',
    tier: 1,
    enemies: [{
      name: 'wretch',
      amount: 7,
      color: '#8B6B5D',
      stats: { hp: 8, dmg: 4, speed: 0.8 }
    }, {
      name: 'biter',
      amount: 12,
      color: '#5A4A3A',
      stats: { hp: 5, dmg: 3, speed: 1.4 }
    }],
    lootTable: { bonesMin: 25, bonesMax: 45, coinsMin: 4, coinsMax: 10, soulChance: 0.04, corpseMin: 5, corpseMax: 9 },
    travelTimeTicks: 80,
    unlockCondition: 'clear pauper\'s tomb 3 times',
    kind: 'ruin',
  },

  'abandoned-chapel': {
    id: 'abandoned-chapel',
    name: 'Abandoned Chapel',
    tier: 1,
    enemies: [{
      name: 'cultist',
      amount: 12,
      color: '#7A4C3C',
      stats: { hp: 8, dmg: 3, speed: 0.9 }
    }, {
      name: 'zealot',
      amount: 5,
      color: '#A86850',
      stats: { hp: 6, dmg: 5, speed: 1.1 }
    }],
    lootTable: { bonesMin: 15, bonesMax: 25, coinsMin: 15, coinsMax: 30, soulChance: 0.04, corpseMin: 4, corpseMax: 7 },
    travelTimeTicks: 90,
    unlockCondition: 'clear wolf den 3 times',
    kind: 'ruin',
  },

  'hollow-keep': {
    id: 'hollow-keep',
    name: 'Hollow Keep',
    tier: 1,
    enemies: [{
      name: 'wretch',
      amount: 20,
      color: '#8B6B5D',
      stats: { hp: 8, dmg: 4, speed: 0.8 }
    }, {
      name: 'alpha',
      amount: 10,
      color: '#5C4A30',
      stats: { hp: 14, dmg: 5, speed: 1.0 }
    }, {
      name: 'keep-captain',
      amount: 1,
      color: '#D14848',
      stats: { hp: 60, dmg: 12, speed: 0.8 }
    }],
    lootTable: { bonesMin: 50, bonesMax: 90, coinsMin: 12, coinsMax: 25, soulChance: 0.08, corpseMin: 10, corpseMax: 16 },
    travelTimeTicks: 110,
    unlockCondition: 'clear all other tier-1 dungeons',
    kind: 'tower',
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 2 — Front lines. Squad caps ~40–100. Day 2.
  // ═══════════════════════════════════════════════════════════════

  'watchers-spire': {
    id: 'watchers-spire',
    name: "Watcher's Spire",
    tier: 2,
    enemies: [{
      name: 'guard',
      amount: 35,
      color: '#607890',
      stats: { hp: 20, dmg: 8, speed: 0.9 }
    }, {
      name: 'warden',
      amount: 15,
      color: '#9ABCD8',
      stats: { hp: 30, dmg: 12, speed: 1.0 }
    }],
    lootTable: { bonesMin: 90, bonesMax: 140, coinsMin: 35, coinsMax: 65, soulChance: 0.08, corpseMin: 14, corpseMax: 22 },
    travelTimeTicks: 150,
    unlockCondition: 'clear hollow keep',
    kind: 'tower',
  },

  'sunken-chapel': {
    id: 'sunken-chapel',
    name: 'Sunken Chapel',
    tier: 2,
    enemies: [{
      name: 'drowned',
      amount: 40,
      color: '#4F6B7A',
      stats: { hp: 25, dmg: 6, speed: 0.7 }
    }, {
      name: 'plague-zealot',
      amount: 14,
      color: '#6B8B5D',
      stats: { hp: 22, dmg: 10, speed: 0.9 }
    }],
    lootTable: { bonesMin: 80, bonesMax: 130, coinsMin: 50, coinsMax: 90, soulChance: 0.09, corpseMin: 18, corpseMax: 28 },
    travelTimeTicks: 170,
    unlockCondition: 'clear watcher\'s spire 3 times',
    kind: 'ruin',
  },

  'black-marsh': {
    id: 'black-marsh',
    name: 'Black Marsh',
    tier: 2,
    enemies: [{
      name: 'fen-stalker',
      amount: 32,
      color: '#3D5040',
      stats: { hp: 18, dmg: 10, speed: 1.2 }
    }, {
      name: 'marsh-alpha',
      amount: 18,
      color: '#5A6B3D',
      stats: { hp: 35, dmg: 12, speed: 1.0 }
    }],
    lootTable: { bonesMin: 110, bonesMax: 170, coinsMin: 40, coinsMax: 75, soulChance: 0.10, corpseMin: 18, corpseMax: 28 },
    travelTimeTicks: 180,
    unlockCondition: 'clear watcher\'s spire 3 times',
    kind: 'skull',
  },

  'whisper-wells': {
    id: 'whisper-wells',
    name: 'Whisper Wells',
    tier: 2,
    enemies: [{
      name: 'guard',
      amount: 50,
      color: '#607890',
      stats: { hp: 20, dmg: 8, speed: 0.9 }
    }, {
      name: 'warden',
      amount: 25,
      color: '#9ABCD8',
      stats: { hp: 30, dmg: 12, speed: 1.0 }
    }, {
      name: 'well-captain',
      amount: 2,
      color: '#D14848',
      stats: { hp: 180, dmg: 28, speed: 0.9 }
    }],
    lootTable: { bonesMin: 160, bonesMax: 260, coinsMin: 70, coinsMax: 120, soulChance: 0.14, corpseMin: 28, corpseMax: 42 },
    travelTimeTicks: 210,
    unlockCondition: 'clear sunken chapel and black marsh',
    kind: 'ruin',
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 3 — Massed combat. Squad caps ~200–500. Day 3.
  // ═══════════════════════════════════════════════════════════════

  'ossuary-of-vael': {
    id: 'ossuary-of-vael',
    name: 'Ossuary of Vael',
    tier: 3,
    enemies: [{
      name: 'knight',
      amount: 220,
      color: '#7A8290',
      stats: { hp: 60, dmg: 18, speed: 0.9 }
    }, {
      name: 'spectre',
      amount: 90,
      color: '#B5D8E8',
      stats: { hp: 50, dmg: 22, speed: 1.4 }
    }],
    lootTable: { bonesMin: 380, bonesMax: 580, coinsMin: 130, coinsMax: 220, soulChance: 0.16, corpseMin: 60, corpseMax: 95 },
    travelTimeTicks: 270,
    unlockCondition: 'clear whisper wells',
    kind: 'tower',
  },

  'burning-reliquary': {
    id: 'burning-reliquary',
    name: 'Burning Reliquary',
    tier: 3,
    enemies: [{
      name: 'inquisitor',
      amount: 160,
      color: '#F0773E',
      stats: { hp: 35, dmg: 25, speed: 1.2 }
    }, {
      name: 'knight',
      amount: 110,
      color: '#7A8290',
      stats: { hp: 60, dmg: 18, speed: 0.9 }
    }, {
      name: 'high-warden',
      amount: 35,
      color: '#D9B872',
      stats: { hp: 100, dmg: 30, speed: 1.0 }
    }],
    lootTable: { bonesMin: 280, bonesMax: 440, coinsMin: 220, coinsMax: 380, soulChance: 0.18, corpseMin: 70, corpseMax: 110 },
    travelTimeTicks: 290,
    unlockCondition: 'clear ossuary of vael 3 times',
    kind: 'skull',
  },

  'sepulchre-of-kings': {
    id: 'sepulchre-of-kings',
    name: 'Sepulchre of Kings',
    tier: 3,
    enemies: [{
      name: 'knight',
      amount: 270,
      color: '#7A8290',
      stats: { hp: 60, dmg: 18, speed: 0.9 }
    }, {
      name: 'high-warden',
      amount: 65,
      color: '#D9B872',
      stats: { hp: 100, dmg: 30, speed: 1.0 }
    }, {
      name: 'bone-titan',
      amount: 3,
      color: '#E8DCB5',
      stats: { hp: 220, dmg: 40, speed: 0.7 }
    }],
    lootTable: { bonesMin: 440, bonesMax: 700, coinsMin: 170, coinsMax: 280, soulChance: 0.20, corpseMin: 80, corpseMax: 130 },
    travelTimeTicks: 310,
    unlockCondition: 'clear ossuary of vael 3 times',
    kind: 'ruin',
  },

  'citadel-of-ash': {
    id: 'citadel-of-ash',
    name: 'Citadel of Ash',
    tier: 3,
    enemies: [{
      name: 'knight',
      amount: 220,
      color: '#7A8290',
      stats: { hp: 60, dmg: 18, speed: 0.9 }
    }, {
      name: 'inquisitor',
      amount: 160,
      color: '#F0773E',
      stats: { hp: 35, dmg: 25, speed: 1.2 }
    }, {
      name: 'high-warden',
      amount: 80,
      color: '#D9B872',
      stats: { hp: 100, dmg: 30, speed: 1.0 }
    }, {
      name: 'bone-titan',
      amount: 6,
      color: '#E8DCB5',
      stats: { hp: 220, dmg: 40, speed: 0.7 }
    }, {
      name: 'saint-captain',
      amount: 1,
      color: '#F3E8A8',
      stats: { hp: 500, dmg: 70, speed: 0.9 }
    }],
    lootTable: { bonesMin: 750, bonesMax: 1200, coinsMin: 320, coinsMax: 520, soulChance: 0.28, corpseMin: 130, corpseMax: 200 },
    travelTimeTicks: 350,
    unlockCondition: 'clear burning reliquary and sepulchre of kings',
    kind: 'tower',
  },

  // ═══════════════════════════════════════════════════════════════
  // TIER 4 — Hordes. Squad caps ~700–1500. Day 4+ (endgame).
  // ═══════════════════════════════════════════════════════════════

  'bone-cathedral': {
    id: 'bone-cathedral',
    name: 'Bone Cathedral',
    tier: 4,
    enemies: [{
      name: 'paladin',
      amount: 800,
      color: '#E8DCB5',
      stats: { hp: 150, dmg: 50, speed: 1.0 }
    }, {
      name: 'arch-inquisitor',
      amount: 280,
      color: '#F0773E',
      stats: { hp: 100, dmg: 80, speed: 1.2 }
    }, {
      name: 'doom-knight',
      amount: 50,
      color: '#5C2E4A',
      stats: { hp: 300, dmg: 60, speed: 0.9 }
    }],
    lootTable: { bonesMin: 1600, bonesMax: 2600, coinsMin: 550, coinsMax: 900, soulChance: 0.32, corpseMin: 280, corpseMax: 440 },
    travelTimeTicks: 430,
    unlockCondition: 'clear citadel of ash',
    kind: 'tower',
  },

  'throne-of-marrow': {
    id: 'throne-of-marrow',
    name: 'Throne of Marrow',
    tier: 4,
    enemies: [{
      name: 'paladin',
      amount: 950,
      color: '#E8DCB5',
      stats: { hp: 150, dmg: 50, speed: 1.0 }
    }, {
      name: 'doom-knight',
      amount: 180,
      color: '#5C2E4A',
      stats: { hp: 300, dmg: 60, speed: 0.9 }
    }, {
      name: 'seraph',
      amount: 30,
      color: '#F3E8A8',
      stats: { hp: 500, dmg: 100, speed: 1.3 }
    }],
    lootTable: { bonesMin: 1900, bonesMax: 3000, coinsMin: 750, coinsMax: 1200, soulChance: 0.36, corpseMin: 320, corpseMax: 500 },
    travelTimeTicks: 480,
    unlockCondition: 'clear bone cathedral 3 times',
    kind: 'tower',
  },

  'final-mausoleum': {
    id: 'final-mausoleum',
    name: 'The Final Mausoleum',
    tier: 4,
    enemies: [{
      name: 'paladin',
      amount: 1200,
      color: '#E8DCB5',
      stats: { hp: 150, dmg: 50, speed: 1.0 }
    }, {
      name: 'doom-knight',
      amount: 350,
      color: '#5C2E4A',
      stats: { hp: 300, dmg: 60, speed: 0.9 }
    }, {
      name: 'seraph',
      amount: 80,
      color: '#F3E8A8',
      stats: { hp: 500, dmg: 100, speed: 1.3 }
    }, {
      name: 'ash-king',
      amount: 4,
      color: '#8C2E2E',
      stats: { hp: 1200, dmg: 150, speed: 0.8 }
    }, {
      name: 'the-final',
      amount: 1,
      color: '#FFFFFF',
      stats: { hp: 5000, dmg: 300, speed: 0.6 }
    }],
    lootTable: { bonesMin: 3500, bonesMax: 5500, coinsMin: 1300, coinsMax: 2200, soulChance: 0.55, corpseMin: 550, corpseMax: 850 },
    travelTimeTicks: 560,
    unlockCondition: 'clear throne of marrow',
    kind: 'tower',
  },
};