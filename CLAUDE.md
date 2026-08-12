# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Use Bun, never npm.**

```bash
bun run dev          # Vite dev server
bun run build        # tsc (typecheck, noEmit) && vite build
bun run preview      # serve the production build
bun lint             # biome check --write — format + lint + organize imports
bunx tsc --noEmit    # typecheck alone — fastest feedback loop
bunx tsx src/combat/benchmark.ts   # headless combat perf breakdown by sub-phase
```

There is no test runner. Biome (`biome.json`) and `tsc` are the only automated checks.

## Workflow

**Run `bun lint` and `bunx tsc --noEmit` after every change, and fix everything they report.** `bun lint` must come back with zero diagnostics — that is the gate, not a guideline. The repo is currently at zero; keep it there rather than leaving a backlog for someone else.

Biome owns formatting — tabs, double quotes, sorted imports, expanded switch cases. Never hand-format against it, and don't reformat untouched code by hand; let `--write` do it.

`--write` applies only safe fixes. `biome check --write --unsafe` exists but rewrites semantics, so read its diff before accepting it rather than running it reflexively.

When a rule genuinely doesn't fit, prefer a narrow escape over weakening the config: an inline `// biome-ignore lint/<rule>: <reason>` with a real reason. `biome.json` disables exactly one rule, `noUnknownAtRules` for CSS, because Biome doesn't know `@tailwind`.

TypeScript runs with `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`, so an unused binding fails the build — this is why you'll see `void mainAffixDef` and `_`-prefixed parameters where a binding is intentionally kept.

### Keep the docs current

- **This file.** When you settle on a convention, or when something described here drifts from the code, update CLAUDE.md in the same change. Don't wait to be asked, and don't leave a stale claim standing.
- **`docs/`** (`architecture.md`, `combat.md`, `systems.md`, `relics.md`) must stay current, short, and informative. Update it whenever you add or remove a significant feature — and prune while you're there; brevity is the point, not coverage.
- Docs describe rules, invariants, and file roles. Balance numbers (costs, loot tables, stat curves) belong in `src/game/data/` and are deliberately *not* duplicated into `docs/`, because that is what rotted the previous versions.

## Architecture

An idle/incremental game: three React tabs over a fixed-timestep simulation, persisted to localStorage.

### Layering (the one hard rule)

`src/game/**` and `src/combat/**` contain no React imports. All rendering lives in `src/ui/**` and `App.tsx`. Logic reads nothing from the UI; the UI reads state through `useGameStore` selectors and calls store actions. Keep this boundary — it's what makes the simulation runnable headlessly (the offline catchup and the benchmark both depend on it).

### Component files

**One component per file, and the file is named after it.** This includes small presentational pieces that only one parent renders — `RowGroupDivider`, `SectionLocked`, and `UpgradeRowCost` each have their own file rather than sitting privately inside their parent. Exporting them is fine; the point is that a component is findable by name.

**Split anything past ~200–300 lines.** A file over that is a signal that several components are sharing a file, or that one component is doing layout work that belongs in children. The exception is a component that is genuinely one indivisible slice of layout or logic — `RelicCard.tsx` is the standing example — where splitting would only scatter a single visual unit across files.

When a screen grows a family of components, give it a subfolder under `src/ui/components/` — `components/workshop/` holds the Workshop's components plus the pure helpers only it uses (`sections.ts` builds the section/row data and owns row visibility/ordering, `cost.ts` maps costs to icons, `types.ts` holds `WRow`/`WSection`). Screens under `src/ui/screens/` should be thin: store selectors, local UI state, and layout composition. `screens/Workshop.tsx` is ~65 lines and is the shape to aim for.

Default to presentational components that take data and callbacks as props, with the screen owning the store wiring — that's what makes the pieces splittable at all. Reaching for `useGameStore` inside a component is reserved for self-contained ones that would otherwise thread props through several layers (`TopBar`, `CryptList`, `DispatchModal`, `CombatWindow` do this); it isn't a shortcut around passing a prop one level down.

### The tick pipeline

`useGameLifecycle` (`src/game/useGameLifecycle.ts`) is the only driver. Each 100ms interval it:

1. `store.tick(100)` — an accumulator drains exact 100ms steps, calling `gameTick(state)`.
2. Instantiates a `CombatEngine` for any squad that just entered `fighting`.
3. Advances every live engine in 16ms fixed steps and calls `resolveFight` when one reports a winner.

`gameTick` (`src/game/tick.ts`) is pure: `GameState → Partial<GameState>`. It never mutates and never touches the engine. Keep it that way — it's the reason the tick is reasonable to follow at all. Autosave happens every 50 ticks (5s).

### `derived` is the central abstraction

`GameState.derived` is a single computed projection of *upgrades purchased + workshop levels + equipped relic affixes* into flat numbers the rest of the code reads (`maxSquadSize`, `bonesPerTick`, per-unit `hpFlat`/`dmgBonus`/…). It is recomputed by `recomputeDerived()` in `src/game/upgrades.ts` and is **never persisted**.

Nothing recomputes it on a timer. Any action that changes upgrades, workshop, or equipped relics must recompute explicitly, via the `withDerived` helper in `src/game/slices/helpers.ts`:

```ts
return withDerived(prev, { /* patch */ });
```

Forgetting this produces stale stats that only correct themselves on the next unrelated action — a slow, confusing bug class. When adding a stat, add it in three places: the `derived` type in `types.ts`, its accumulator + return in `recomputeDerived`, and the consumer.

### Combat is authoritative and lives outside game state

`CombatEngine` (`src/combat/engine.ts`) is a boids-style particle sim and it *decides* dungeon outcomes — it is not decoration. Engines are held in `store.combatEngines`, a `Map` that is runtime-only (never saved, cleared on catchup). `resolveFight` in the store converts survivor counts into squad composition, loot, and banners.

`CombatWindow.tsx` renders an engine and, once the fight is off the live map, replays it locally for looping visuals. It must never feed back into game state.

`src/combat/tierA.ts` is the hot loop (spatial hash, cell-aggregate flocking) and is performance-tuned; measure with the benchmark before restructuring it. `src/combat/config.ts` is exhaustively commented with sane ranges per field and marks fields left UNUSED by the aggregate-model rewrite — tune one value at a time.

### Offline catchup is a parallel implementation — keep it in sync

`src/game/catchupOffline.ts` re-simulates up to 8 hours away from the game by jumping between squad events on a min-heap instead of stepping 100ms ticks, resolving fights headlessly with a cached, seeded engine. It deliberately duplicates the live rules.

**Any change to travel time, fight resolution, loot, or auto-deploy in `tick.ts`/`store.ts` must be mirrored here**, or players get different results online vs. offline. The mirrored pairs today: `generateLoot` ↔ `generateLootSeeded` (both delegate the repeat-clear scaling to `clearMultiplier`, the soul roll to `effectiveSoulChance`, and the corpse roll to `rollCorpses`), travel speed ↔ `computeTravelTime` (both now delegate to `effectiveTravelTicks` in `src/game/travel.ts`, which the Crypt UI also uses so displayed timers match the simulation), the auto-deploy branch ↔ the `returnArrive` case, the yield bonuses applied on loot deposit ↔ the same case, the banner award and the wipe handling in `resolveFight` (undying remnant retreats, everything else deleted — both sides call `remnantAfterWipe`/`compositionAfterFight` from `src/game/units.ts`) ↔ the `outboundArrive` case, and `checkUnlockConditions` in both.

Two intentional deviations from house style live here: it mutates its own cloned working state (a deep-ish clone made by `cloneForCatchup`) for speed, and it uses seeded `mulberry32` instead of `Math.random` so a mid-window refresh reproduces identical results. Preserve both.

### Data tables and the id contract

`src/game/data/{upgrades,relics,dungeons}.ts` are pure data. Their string ids are the contract with logic, and **adding a data row without wiring its id is a silent no-op** — a whole category of bug in this repo:

- Upgrade node ids (`s0`, `c7`, `n4b`, …) are `switch` cases in `recomputeDerived`. Nodes whose effect lives elsewhere (or isn't built yet) appear as `case "x": break;` with an explanatory comment — keep that convention instead of omitting the case, so the tree stays auditable against the switch.
- Relic affix ids are `switch` cases in `applyAffix`. `AFFIX_DEFS` carries `implemented: false` for affixes that roll but do nothing; every id in a base's `minorAffixPool` and its `mainAffixId` must exist in `AFFIX_DEFS`, or the roll is silently dropped.
- Prerequisite/unlock ids in the upgrade tree must round-trip; nothing validates them at build time.

### Persistence

`src/game/save.ts` serializes the `PERSISTED_KEYS` allowlist (never `derived`) under `necromancer_save_v1` and gates on `SAVE_VERSION`. `loadGame()` results are spread over defaults by `buildHydratedState()` in `src/game/initialState.ts`, so new state fields get their defaults for free on old saves. **Adding a persisted slice means adding it to `PERSISTED_KEYS` and nothing else** — that one list drives writing, import validation, and the required-field check.

Import and reset are store actions (`persistenceSlice`), not direct `save.ts` calls, and both call `suspendPersistence()` before touching `localStorage`. The tick loop keeps running during the ~1s before the page reloads, so without the guard an autosave or the tail of an in-flight offline catchup overwrites the save that was just installed. If you add another path that writes a save and then reloads, suspend first.

### Store conventions

`src/game/store.ts` composes one Zustand store from five slice creators in `src/game/slices/` (`combat`, `squad`, `relic`, `progression`, `persistence`). The split is by domain only — every slice is a `StateCreator` over the whole `StoreState`, so a slice may read anything through `get()`. Put a new action in the slice that owns its state; only genuinely cross-cutting primitives belong in `slices/helpers.ts` (`withDerived`, `applyUnitDelta`, `hasUnitsAvailable`, `withoutRelic`).

Actions are reducers: `set(prev => …)` returning a partial, immutable spread copies, and an early `return prev` to reject an invalid operation rather than throwing or asserting. Preconditions are checked at the top of the action, not by the caller — callers may fire freely.

`slices/types.ts` and the slice files import each other's types circularly. That's fine — every such import is `import type` and erases at compile time; don't "fix" it by moving interfaces away from their implementations.

## Styling

**Tailwind is the target end state. Everything else is migration debt.**

Two systems coexist today:

- `src/index.css` — `:root` CSS custom properties (`--ink-bone`, `--c-coin`, `--rule`, …) plus ~70 hand-written component classes (`.necro`, `.bar-top`, `.bar-tabs`, `.stage`, `.display`, `.mono`) across ~110 rules.
- Tailwind, with the palette mirrored as named colors in `tailwind.config.ts` (`bone`, `coin`, `soul`, `bg-panel`, `r-legendary`, …).

Current debt: ~170 inline `style={{…}}` props and ~79 `!`-prefixed utilities, plus those 70 custom classes.

Webfonts load from the `<link>` tags in `index.html`; `index.css` must not re-`@import` them. Those tags still request Cinzel, Courier Prime, and VT323, which no font stack references.

Known token divergence: Tailwind's `rule` (`#1a1a1a`) and `rule-strong` (`#8a795b`) do **not** match `--rule` / `--rule-strong` (translucent warm hairlines), so `border-rule` and `border: 1px solid var(--rule)` render differently. Both spellings are in use. Aligning them is a one-time visual decision, not something to change in passing — use `border-[color:var(--rule-strong)]` when an edit must preserve exact appearance.

### Rules for new and touched code

1. **Use Tailwind utilities.** Don't add a custom class in `index.css` for anything Tailwind does trivially — that's most padding, color, border, flex/grid, and typography work.
2. **Don't add inline `style={{…}}`.** Migrate the ones you encounter. The only legitimate use is a value genuinely computed at runtime (`width: ${pct * 100}%`, an interpolated HP color); even then, prefer an arbitrary-value utility (`w-[--w]`, `text-[color:var(--x)]`) where it reads cleanly. Static values in a `style` prop are always a bug to fix.
3. **Avoid `!` unless there is no alternative.** The reason it spread: `index.css` component classes are declared *after* `@tailwind utilities`, so they win at equal specificity, and `!tracking-[0.24em]` exists only to beat `.display`'s own `letter-spacing`. The correct fix is to strip the property from the legacy class (or drop the class) rather than escalate with `!`. Biome flags `!important` in CSS via `noImportantStyles`.
4. **Keep global CSS variables in Tailwind.** New design tokens go in `tailwind.config.ts`, not `:root`. Reserve `:root` for what the Tailwind theme genuinely can't express, and while both exist, any palette change must update **both** or they silently diverge.
5. Prefer Tailwind named colors over raw hex or `var(--…)` in markup.

Migrating a legacy class is expected cleanup when you're already editing that markup — convert it, delete the now-dead rule from `index.css`, and check no other component still uses it.

**Converting a `<div>` to a `<button>` needs `w-full`.** Form controls resolve `width: auto` as shrink-to-fit, not fill-available, even at `display: block` or `grid`. A converted container therefore collapses around its content — and if a child uses `width: 100%`, the percentage becomes circular and the element shrinks to a few pixels. Add `w-full` (and `text-left` where content was left-aligned) unless the element is a flex/grid *item*, which stretches on its own.

Screens are keyboard-routed from `App.tsx` (keys `1`–`4`) and each renders its own `TopBar`/`TabBar`. `TabId` is declared in both `App.tsx` and `TabBar.tsx` — they must agree.

## Known rough edges

Don't mistake these for intentional design:

- Several upgrade and affix descriptions promise effects that aren't implemented (`implemented: false`, `case "x": break;`). Check the switch before assuming a described effect exists.
- `derived.boneSurgeActive` and `derived.rarityBoostActive` are set by `n1a` and `n5b` and read by nothing. `n1a` still works — its real effect is the `bonesPassiveMult` it also applies — but `n5b` does nothing at all, and its `case` comment claiming the gacha handles it is wrong: `executePull` never reads `derived`.
- Relic `upgradeLevel` and `duplicateCount` are read (affix boost, `InvCard`'s `×n` badge, `RelicDetail`'s `n/5 DUPES` pips) but never written — there is no fusion or dedupe path, so both are permanently 0 and that UI is inert.
