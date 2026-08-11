# Architecture

Idle/incremental game: four React tabs over a fixed-timestep simulation, persisted to `localStorage`.

Vite 5 · React 18 · TypeScript 5 (strict) · Zustand 4 · Tailwind 3 · Biome 2.

## Layers

```
src/game/     simulation + state. No React imports.
src/combat/   battle engine. No React imports.
src/ui/       screens and components. Reads state via useGameStore selectors.
```

One component per file. A screen with a large component set gets a subfolder under `src/ui/components/` (`components/workshop/`), holding its components plus the pure builders and helpers only it uses.

The React-free boundary is load-bearing: it's what lets the simulation run headlessly in offline catchup and in `src/combat/benchmark.ts`.

## Tick pipeline

`useGameLifecycle` is the only driver. Every 100 ms it:

1. Calls `store.tick(100)`, whose accumulator drains exact 100 ms steps through `gameTick(state)`.
2. Creates a `CombatEngine` for any squad that just entered `fighting`.
3. Advances live engines in 16 ms steps and calls `resolveFight` when one reports a winner.

`gameTick` (`game/tick.ts`) is pure — `GameState → Partial<GameState>`. It never mutates and never touches the engine. Autosave runs every 50 ticks (5 s). 1200 ticks = one in-game day.

## `derived`

`GameState.derived` projects *upgrades purchased + workshop levels + equipped relic affixes* into flat numbers the rest of the code reads. Computed by `recomputeDerived` (`game/upgrades.ts`), never persisted, and **not** recomputed on a timer — every action that changes those inputs must recompute explicitly, via the `withDerived` helper in `game/slices/helpers.ts`:

```ts
return withDerived(prev, { /* patch */ });
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

## Store layout

One Zustand store, composed in `game/store.ts` from five slice creators in `game/slices/`. Slices are a domain split only — they share a single state object, so any slice may read the whole store through `get()`.

| Slice | Owns |
|---|---|
| `combatSlice` | `combatEngines` map + `tick` (accumulator, autosave counter) |
| `squadSlice` | dispatch, recall, create, delete, `resolveFight`, squad-id counter |
| `relicSlice` | equip, unequip, mark seen, sacrifice (single + bulk), gacha `pull` |
| `progressionSlice` | upgrade purchase, workshop levels, summoning, dig |
| `persistenceSlice` | `importSave`, `resetSave` |

Actions are reducers: `set(prev => …)` returning a partial, immutable spread copies, and an early `return prev` to reject an invalid operation rather than throwing. Preconditions are checked at the top of the action, not by the caller. `game/slices/helpers.ts` holds the cross-slice primitives (`withDerived`, `applyUnitDelta`, `withoutRelic`).

## Persistence

`game/save.ts` serializes the `PERSISTED_KEYS` allowlist (never `derived`) under `necromancer_save_v1`, gated on `SAVE_VERSION`. Loads are spread over defaults by `buildHydratedState()` (`game/initialState.ts`), so new fields pick up defaults on old saves. Adding a persisted slice means adding it to `PERSISTED_KEYS` — that single list drives writing, validation on import, and the required-field check.

Import and reset go through store actions, not `save.ts` directly. Both call `suspendPersistence()` before touching `localStorage`: the tick loop keeps running during the ~1 s before the page reloads, and an autosave or a finishing offline catchup would otherwise overwrite the bytes just written. Import also stamps `meta.lastTickAt` to now, so restoring an old export doesn't immediately grant offline catchup.

## Screens

| Key | Screen | Notes |
|-----|--------|-------|
| 1 | Crypt Map | Dungeon list, squad roster, live combat canvases |
| 2 | Reliquary | Equipped slots, relic detail, inventory with type/rarity filters + bulk sacrifice |
| 3 | Ritual | Three gacha pools, reveal overlay |
| 4 | Upgrades | Skill tree and Workshop sub-views |

Each screen renders its own `TopBar`/`TabBar`. `TabId` is declared in both `App.tsx` and `TabBar.tsx` and the two must agree.

See also: [combat.md](combat.md), [systems.md](systems.md), [relics.md](relics.md).
