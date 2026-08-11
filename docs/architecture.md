# Architecture

Idle/incremental game: four React tabs over a fixed-timestep simulation, persisted to `localStorage`.

Vite 5 · React 18 · TypeScript 5 (strict) · Zustand 4 · Tailwind 3 · Biome 2.

## Layers

```
src/game/     simulation + state. No React imports.
src/combat/   battle engine. No React imports.
src/ui/       screens and components. Reads state via useGameStore selectors.
```

The React-free boundary is load-bearing: it's what lets the simulation run headlessly in offline catchup and in `src/combat/benchmark.ts`.

## Tick pipeline

`useGameLifecycle` is the only driver. Every 100 ms it:

1. Calls `store.tick(100)`, whose accumulator drains exact 100 ms steps through `gameTick(state)`.
2. Creates a `CombatEngine` for any squad that just entered `fighting`.
3. Advances live engines in 16 ms steps and calls `resolveFight` when one reports a winner.

`gameTick` (`game/tick.ts`) is pure — `GameState → Partial<GameState>`. It never mutates and never touches the engine. Autosave runs every 50 ticks (5 s). 1200 ticks = one in-game day.

## `derived`

`GameState.derived` projects *upgrades purchased + workshop levels + equipped relic affixes* into flat numbers the rest of the code reads. Computed by `recomputeDerived` (`game/upgrades.ts`), never persisted, and **not** recomputed on a timer — every action that changes those inputs must recompute explicitly:

```ts
const newState = { ...prev, /* mutation */ };
return { ...newState, derived: recomputeDerived(newState) };
```

Some `derived` fields are computed but not yet consumed (`corpseYieldBonus`, `boneSurgeActive`, `soulHarvestBonus`, `rarityBoostActive`). Check the consumer before assuming a value has an effect.

## State shape

```
resources   bones, coins, souls, dust, corpses
units       reserve counts per type
squads      Squad[] — composition, state, position, pendingLoot
dungeons    DungeonState[] — clearCount, unlocked
relics      { inventory, equipped }
upgrades    { purchased, availablePoints }
gacha       { pityCounters, lastPulledRelics }
workshop    per-unit stat levels, crypt levels, garden plots
meta        tickCount, dayCount, version, lastTickAt
derived     computed, never persisted
```

Live `CombatEngine` instances live in `store.combatEngines`, a runtime-only `Map` outside `GameState`.

## Persistence

`game/save.ts` serializes an explicit allowlist of slices (never `derived`) under `necromancer_save_v1`, gated on `SAVE_VERSION`. Loads are spread over `buildInitialState()`, so new fields pick up defaults on old saves. Adding a persisted slice means updating `saveGame` **and** `importSave`'s `required` list.

## Screens

| Key | Screen | Notes |
|-----|--------|-------|
| 1 | Crypt Map | Dungeon list, squad roster, live combat canvases |
| 2 | Reliquary | Equipped slots, relic detail, inventory, set progress |
| 3 | Ritual | Three gacha pools, reveal overlay |
| 4 | Upgrades | Skill tree and Workshop sub-views |

Each screen renders its own `TopBar`/`TabBar`. `TabId` is declared in both `App.tsx` and `TabBar.tsx` and the two must agree.

See also: [combat.md](combat.md), [systems.md](systems.md), [relics.md](relics.md).
