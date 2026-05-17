# Necromancer — Architecture

## Tech Stack

- **Vite 5** — build tool and dev server
- **React 18** — UI framework (JSX, hooks)
- **TypeScript 5** — strict mode, no `any`
- **Zustand 4** — global state store
- **Tailwind CSS 3** — utility classes with custom dark-fantasy theme
- **SVG** — map canvas (dungeons, paths, squad dots)
- **localStorage** — persistence (key: `necromancer_save_v1`)

## File Structure

```
src/
  game/              # Pure logic — no React imports
    types.ts         # All TypeScript interfaces and types
    store.ts         # Zustand store with all actions
    tick.ts          # Game loop step function (pure)
    relics.ts        # Affix rolling, fusion, sacrifice math
    dungeons.ts      # Dungeon helpers and unlock logic
    upgrades.ts      # Derived stat computation, purchase validation
    gacha.ts         # Pool odds, pity, x10 guarantee
    save.ts          # localStorage serialization/deserialization
    data/
      relics.ts      # 12 relic base definitions + affix pool
      dungeons.ts    # 5 dungeon definitions
      upgrades.ts    # 36 upgrade node definitions
  ui/
    screens/
      CryptMap.tsx   # Main map screen — SVG canvas + sidebar
      Reliquary.tsx  # Equipped slots + relic detail + inventory
      Ritual.tsx     # 3 gacha pool panels + pull history
      Upgrades.tsx   # 3-branch upgrade tree + node detail
      Codex.tsx      # Stub screen (Phase III placeholder)
    components/
      TopBar.tsx     # Currency display + phase indicator
      TabBar.tsx     # 5-tab navigation bar
      Icons.tsx      # All SVG icons + node icon map
      HPBar.tsx      # HP progress bar with color thresholds
      DispatchModal.tsx  # Squad composition + dispatch UI
      NecroticSurge.tsx  # Surge cooldown ring + buff selection
    theme.ts         # Color helpers, number formatters
  App.tsx            # Root: RAF loop, tab routing, keyboard shortcuts
  main.tsx           # React DOM mount
  index.css          # CSS custom properties + all .necro classes
docs/
  architecture.md    # This file
  systems.md         # Game systems documentation
  relics.md          # Relic system documentation
```

## Game Loop Design

The game runs at a fixed 10Hz tick rate regardless of monitor refresh rate.

```
requestAnimationFrame(loop)
  → accumulate deltaMs
  → while accumulator >= 100ms:
      gameTick(state) → Partial<GameState>
      merge delta into store
      recompute derived stats if needed
  → auto-save every 50 ticks (5s)
```

`gameTick()` in `tick.ts` is a pure function: it takes the current state and returns a partial update. This makes it testable in isolation.

## State Shape

```typescript
GameState {
  resources: { bones, coins, souls, dust, corpses }
  units: { skeletons, zombies, wraiths }           // reserves
  squads: Squad[]                                   // active/idle squads
  dungeons: DungeonState[]                          // HP, cooldown, clear count
  relics: { inventory, equipped }                   // relic management
  upgrades: { purchased, availablePoints }
  surge: { cooldownTicks, charges, activeBuff, ... }
  gacha: { pityCounters, pullHistory, sessionTotals }
  meta: { tickCount, dayCount, version }
  derived: { ... }                                  // computed, NOT persisted
}
```

The `derived` object is recomputed via `recomputeDerived()` whenever relics are equipped/unequipped or upgrades are purchased. It is excluded from saves.

## Persistence Strategy

- `saveGame()` serializes all state except `derived` to localStorage
- `loadGame()` validates the save version; returns `null` on mismatch
- Save occurs every 50 game ticks (5s) during gameplay
- On version mismatch, a reset confirmation is shown (not silent corruption)

## Screens

| Tab | Screen | Description |
|-----|---------|-------------|
| 1   | Crypt Map | SVG map with dungeon nodes, squad dots, sidebar, surge |
| 2   | Reliquary | Equipped slots, relic detail panel, inventory grid |
| 3   | Ritual of Calling | 3 gacha pools, pull history, reveal animation |
| 4   | Upgrade Tree | 3-branch tree, node detail, purchase flow |
| 5   | Soul Codex | Placeholder for Phase III content |
