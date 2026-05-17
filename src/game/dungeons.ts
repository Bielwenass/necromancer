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
  const paupersClearCount = dungeons.find(d => d.id === 'paupers-tomb')?.clearCount ?? 0;
  const wolfDenClearCount = dungeons.find(d => d.id === 'wolf-den')?.clearCount ?? 0;
  const tier1AllCleared = Object.values(DUNGEON_DEFS)
    .filter(d => d.tier === 1)
    .every(def => (dungeons.find(d => d.id === def.id)?.clearCount ?? 0) > 0);
  const watchersCleared = (dungeons.find(d => d.id === 'watchers-spire')?.clearCount ?? 0) > 0;

  return dungeons.map(ds => {
    if (ds.unlocked) return ds;
    let shouldUnlock = false;
    switch (ds.id) {
      case 'wolf-den':        shouldUnlock = paupersClearCount >= 3; break;
      case 'abandoned-chapel': shouldUnlock = wolfDenClearCount >= 3; break;
      case 'watchers-spire':  shouldUnlock = tier1AllCleared; break;
      case 'ossuary-of-vael': shouldUnlock = watchersCleared; break;
    }
    return shouldUnlock ? { ...ds, unlocked: true } : ds;
  });
}
