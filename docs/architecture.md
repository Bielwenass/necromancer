# Architecture

Idle/incremental game: four React tabs over a fixed-timestep simulation, persisted
to `localStorage`.

Vite 5 · React 18 · TypeScript 5 (strict) · Zustand 4 · Tailwind 3 · Biome 2.

## Layers

```
src/game/     simulation + state. No React imports.
  data/       balance numbers only. Imports nothing but ./types.
  rules/      pure functions over that data. No store, no React.
  slices/     store actions.
src/combat/   battle engine. No React imports.
src/ui/       screens and components. Reads state via useGameStore selectors.
src/tune/     `tune.html`, a dev page for the combat model. Dev server only.
```

**Every balance number lives in `src/game/data/`.** The one exception is
`src/combat/config.ts`, which holds combat feel (steering weights, collision
spacing, render sizes) beside the loop it tunes.

`rules/` holds the pure functions over that data. One of them, `describe.ts`,
generates player-facing text for every rule from the rule itself, so a description
can't promise a number the simulation doesn't apply.

One component per file. `src/ui/components/` is split by feature, one folder per
screen, each holding its components plus the helpers only it uses. `common/` holds
shared primitives (`Screen`, `Modal`, `ConfirmAction`, `Meter`, `StatRow`,
`EmptyState`, `SectionLabel`, `UnitDot`) and `chrome/` the app frame. Check
`common/` before hand-rolling a panel, dialog, or confirm. Shared helpers sit at
`src/ui/`: `theme.ts` (rarity colours, and `UNIT_COLORS` re-exported from the game
layer, since the canvas can't read a CSS variable), `format.ts`, `resources.ts`.

The React-free boundary is load-bearing: it lets the simulation run headlessly in
offline catchup, in `src/combat/benchmark.ts`, and under `bun test`.

## Tick pipeline

`useGameLifecycle` is the only driver. Its interval fires every 100 ms and owes
time by the wall clock: a late or suspended timer runs the ticks it missed, and a
gap past `CATCHUP_THRESHOLD_MS` goes to catchup. That, plus `pagehide`/`pageshow`
and `freeze`/`resume` alongside `visibilitychange`, covers a mobile browser
backgrounded without a visibility transition.

Per tick it:

1. Calls `store.tick()`, one step of `gameTick(state)`. The wall-clock accumulator
   is the hook's alone, since the loop has to step live engines between game ticks.
2. Advances live engines by one tick of sim time (`stepLiveFights`) and calls
   `resolveFight` on any that report a winner.
3. Creates a `CombatEngine` for any squad that just entered `fighting`
   (`beginLiveFights`), last, so a new engine's first step lands on the next tick.

`gameTick` (`game/tick.ts`) is a thin pacer: it clones the state and calls
`advance` (`game/advance.ts`) for a single tick. **`advance` is the simulation**,
and offline catchup calls the same function for a whole span at a time; see
[systems.md](systems.md#offline-catchup). It mutates only the draft it is handed,
never `derived`, and never reads the clock or `Math.random`.

Every constant above lives in `game/data/pacing.ts`, sole owner of `TICK_MS`,
`TICKS_PER_SECOND`, `ENGINE_DT`, `TICKS_PER_DAY`, `TICKS_PER_AUTOSAVE`,
`MAX_OFFLINE_MS`, `CATCHUP_THRESHOLD_MS`, `MAX_FIGHT_MS`, and
`MAX_HEADLESS_TICKS` (derived from `MAX_FIGHT_MS`).

## `derived`

`GameState.derived` projects upgrades purchased, workshop levels, and equipped
relic affixes into flat numbers the rest of the code reads. Computed by
`recomputeDerived` (`game/rules/derived.ts`), never persisted, and never
recomputed on a timer: every action changing those inputs recomputes explicitly
through `withDerived` (`game/slices/helpers.ts`).

```ts
return withDerived(prev, { /* patch */ });
```

`recomputeDerived` folds its three sources in order, upgrade nodes then workshop
levels then equipped relics. The order matters: a `pctOfSelf` effect takes a share
of the running total, so relics must see a settled base.

## State shape

```
resources   bones, souls, dust, corpses, banners
units       reserve counts per type
squads      Squad[]: composition, roster, state, phaseStart/EndTick, pendingLoot
dungeons    DungeonState[]: clearCount, unlocked
relics      { inventory, equipped }
upgrades    { purchased }
gacha       { pityCounters, lastPulledRelics }
workshop    per-unit stat levels, crypt levels, garden plots
meta        tickCount, dayCount, version, lastTickAt
derived     computed, never persisted
```

Live `CombatEngine` instances live in `store.combatEngines`, a runtime-only `Map`
outside `GameState`.

## Store layout

One Zustand store, composed in `game/store.ts` from five slice creators in
`game/slices/`. Slices are a domain split over a single shared state object, so
any slice may read the whole store through `get()`.

| Slice | Owns |
|---|---|
| `combatSlice` | `combatEngines` map + `tick` (one step, autosave counter) |
| `squadSlice` | dispatch, recall, replenish, create, delete, `resolveFight`, squad-id counter |
| `relicSlice` | equip, unequip, mark seen, sacrifice (single + bulk), gacha `pull` |
| `progressionSlice` | upgrade purchase, workshop levels, summoning, dig |
| `persistenceSlice` | `importSave`, `resetSave` |

Actions are reducers: `set(prev => …)` returning a partial, immutable spread
copies, and an early `return prev` to reject an invalid operation. Preconditions
are checked at the top of the action. `game/slices/helpers.ts` holds the
cross-slice primitives (`withDerived`, `applyUnitDelta`, `withoutRelic`).

## Persistence

`game/save.ts` serializes the `PERSISTED_KEYS` allowlist (never `derived`) under
`necromancer_save_v1`, gated on `SAVE_VERSION`. Loads are spread over defaults by
`buildHydratedState()` (`game/initialState.ts`), so new fields pick up defaults on
old saves. Adding a persisted slice means adding it to `PERSISTED_KEYS`; that
single list drives writing, validation on import, and the required-field check.

Import and reset go through store actions. Both call `suspendPersistence()` before
touching `localStorage`: the tick loop keeps running during the ~1 s before the
page reloads, and an autosave or a finishing offline catchup would overwrite the
bytes just written. Import also stamps `meta.lastTickAt` to now, so restoring an
old export grants no offline catchup.

## Screens

Exactly four, one per `TabId`, all in `src/ui/screens/`. `tune.html` is a second
Vite entry outside this frame, reachable only in dev:

| Key | Screen | Notes |
|-----|--------|-------|
| 1 | Crypt | Dungeon list, squad roster, live combat canvases |
| 2 | Reliquary | Equipped slots, relic detail, inventory with type/rarity filters + bulk sacrifice |
| 3 | Ritual | Three gacha pools, reveal overlay |
| 4 | Workshop | Skill tree and workshop sections |

Screens are thin: store selectors, local UI state, and layout composition, wrapped
in `components/common/Screen`, which owns the `TopBar` / `.stage` / `TabBar` frame.
`TabId` is declared once, in `TabBar.tsx`; `App.tsx` imports it.

See also: [combat.md](combat.md), [systems.md](systems.md), [relics.md](relics.md).
