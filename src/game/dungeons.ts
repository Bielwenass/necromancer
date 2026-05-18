import type { DungeonDef, DungeonState } from './types';
import { DUNGEON_DEFS } from './data/dungeons';

export { DUNGEON_DEFS };

export function makeDungeonState(def: DungeonDef, unlocked: boolean): DungeonState {
  return {
    id: def.id,
    clearCount: 0,
    unlocked,
  };
}

export function checkUnlockConditions(dungeons: DungeonState[]): DungeonState[] {
  const clears = (id: string) => dungeons.find(d => d.id === id)?.clearCount ?? 0;
  const tier1OthersCleared = Object.values(DUNGEON_DEFS)
    .filter(d => d.tier === 1 && d.id !== 'hollow-keep')
    .every(def => clears(def.id) > 0);

  return dungeons.map(ds => {
    if (ds.unlocked) return ds;
    let shouldUnlock = false;
    switch (ds.id) {
      // Tier 1
      case 'wolf-den':          shouldUnlock = clears('paupers-tomb') >= 3; break;
      case 'abandoned-chapel':  shouldUnlock = clears('wolf-den') >= 3; break;
      case 'hollow-keep':       shouldUnlock = tier1OthersCleared; break;
      // Tier 2
      case 'watchers-spire':    shouldUnlock = clears('hollow-keep') > 0; break;
      case 'sunken-chapel':     shouldUnlock = clears('watchers-spire') >= 3; break;
      case 'black-marsh':       shouldUnlock = clears('watchers-spire') >= 3; break;
      case 'whisper-wells':     shouldUnlock = clears('sunken-chapel') > 0 && clears('black-marsh') > 0; break;
      // Tier 3
      case 'ossuary-of-vael':   shouldUnlock = clears('whisper-wells') > 0; break;
      case 'burning-reliquary': shouldUnlock = clears('ossuary-of-vael') >= 3; break;
      case 'sepulchre-of-kings':shouldUnlock = clears('ossuary-of-vael') >= 3; break;
      case 'citadel-of-ash':    shouldUnlock = clears('burning-reliquary') > 0 && clears('sepulchre-of-kings') > 0; break;
      // Tier 4
      case 'bone-cathedral':    shouldUnlock = clears('citadel-of-ash') > 0; break;
      case 'throne-of-marrow':  shouldUnlock = clears('bone-cathedral') >= 3; break;
      case 'final-mausoleum':   shouldUnlock = clears('throne-of-marrow') > 0; break;
    }
    return shouldUnlock ? { ...ds, unlocked: true } : ds;
  });
}
