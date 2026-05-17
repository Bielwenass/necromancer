import type { Relic, Rarity } from './types';
import { RELIC_BASES, AFFIX_DEFS } from './data/relics';

let relicCounter = 0;

function rollPosition(): number {
  if (Math.random() < 0.8) {
    // center band 40-60%
    return 0.4 + Math.random() * 0.2;
  }
  return Math.random(); // full range
}

function rollValue(range: [number, number], pos: number): number {
  return range[0] + (range[1] - range[0]) * pos;
}

const MINOR_COUNT: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 3,
};

export function rollRelic(baseId: string, rarity: Rarity): Relic {
  const base = RELIC_BASES.find(b => b.id === baseId);
  if (!base) throw new Error(`Unknown relic base: ${baseId}`);

  const mainPos = rollPosition();
  const mainAffixDef = AFFIX_DEFS[base.mainAffixId];
  const mainValue = rollValue(base.mainAffixRange, mainPos);

  const minorCount = MINOR_COUNT[rarity];
  const pool = [...base.minorAffixPool];
  const minorAffixes = [];

  for (let i = 0; i < minorCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const affixId = pool.splice(idx, 1)[0];
    const affixDef = AFFIX_DEFS[affixId];
    if (!affixDef) continue;
    const pos = rollPosition();
    const value = rollValue(affixDef.range, pos);
    minorAffixes.push({ id: affixId, value, rollPosition: pos });
  }

  const allPositions = [mainPos, ...minorAffixes.map(a => a.rollPosition)];
  const quality = Math.round((allPositions.reduce((s, p) => s + p, 0) / allPositions.length) * 100);

  // Suppress unused variable warning
  void mainAffixDef;

  return {
    id: `relic-${++relicCounter}-${Date.now()}`,
    baseId,
    rarity,
    mainAffix: { id: base.mainAffixId, value: mainValue, rollPosition: mainPos },
    minorAffixes,
    upgradeLevel: 0,
    duplicateCount: 0,
    quality,
    isNew: true,
  };
}

export const DUST_VALUES: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 10,
  epic: 30,
  legendary: 100,
};

export function getAffixLabel(affixId: string): string {
  return AFFIX_DEFS[affixId]?.label ?? affixId;
}

export function getAffixUnit(affixId: string): string {
  return AFFIX_DEFS[affixId]?.unit ?? '';
}

export function formatAffixValue(affixId: string, value: number, upgradeLevel = 0): string {
  const unit = getAffixUnit(affixId);
  const boosted = value * (1 + upgradeLevel * 0.1);
  if (unit === '%') {
    return `+${Math.round(boosted)}%`;
  }
  return `+${Math.round(boosted)}`;
}

export function fuseRelics(inventory: Relic[], baseId: string, rarity: Rarity): { newInventory: Relic[]; success: boolean } {
  const dupes = inventory.filter(r => r.baseId === baseId && r.rarity === rarity);
  if (dupes.length < 5) return { newInventory: inventory, success: false };

  // Keep highest quality, sacrifice rest
  dupes.sort((a, b) => b.quality - a.quality);
  const keeper = dupes[0];
  const toRemove = dupes.slice(1, 5).map(r => r.id);

  const newInventory = inventory.filter(r => !toRemove.includes(r.id));
  const keeperIdx = newInventory.findIndex(r => r.id === keeper.id);
  if (keeperIdx >= 0) {
    newInventory[keeperIdx] = {
      ...keeper,
      upgradeLevel: Math.min(5, keeper.upgradeLevel + 1),
    };
  }
  return { newInventory, success: true };
}
