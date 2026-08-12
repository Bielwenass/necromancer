# CLAUDE.md

Guidance for Claude Code working in this repository.

## Commands

**Use Bun, never npm.**

```bash
bun run dev          # Vite dev server
bun run build        # tsc (typecheck, noEmit) && vite build
bun lint             # biome check --write — format + lint + organize imports
bunx tsc --noEmit    # typecheck alone — fastest feedback loop
bunx tsx src/combat/benchmark.ts   # headless combat perf breakdown
bunx tsx src/game/parityCheck.ts   # online/offline simulation parity assertions
```

There is no test runner. Biome and `tsc` are the automated gates; `parityCheck.ts` is the one behavioural check, and it must pass after any change to the tick, catchup, loot, or fight rules.

## Workflow

**Run `bun lint` and `bunx tsc --noEmit` after every change and fix everything they report.** Zero diagnostics is the gate, not a goal.

- Biome owns formatting (tabs, double quotes, sorted imports). Never hand-format against it; don't reformat untouched code.
- `--write` is safe fixes only. `biome check --write --unsafe` rewrites semantics — read its diff before accepting.
- When a rule doesn't fit, use a narrow `// biome-ignore lint/<rule>: <reason>` rather than weakening `biome.json`.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are on — hence `void x` and `_`-prefixed params where a binding is intentionally kept.

### Comments and docs

**Comments describe what the code does now** — concise and informative. Never narrate history ("used to be…", "replaced the old…", "this fixed a bug where…"); if the current behaviour needs justifying, state the invariant, not the story. Same rule applies to this file and `docs/`.

- Update CLAUDE.md in the same change whenever a convention here drifts from the code.
- **`docs/`** (`architecture.md`, `combat.md`, `systems.md`, `relics.md`) covers rules, invariants, and file roles. Keep it short — prune while you're there.
- Balance numbers live in `src/game/data/`, never duplicated into docs or UI strings.

## Architecture

An idle/incremental game: four React tabs over a fixed-timestep simulation, persisted to localStorage.

### Layering (the one hard rule)

`src/game/**` and `src/combat/**` contain **no React imports**. Rendering lives in `src/ui/**` and `App.tsx`. Logic reads nothing from the UI; the UI reads state through `useGameStore` selectors and calls store actions. This boundary is what makes the simulation runnable headlessly (offline catchup, benchmark, parity check all depend on it).

Inside `src/game/`:

```
data/      balance numbers only — imports nothing but ./types
rules/     pure functions over that data — no store, no React
slices/    store actions
*.ts       state, tick, persistence, lifecycle
```

**`data/` is the only place to retune the game.** Any literal a designer would change — cost, rate, chance, cap, duration, curve coefficient, starting value — belongs there. The one exception is `src/combat/config.ts`, which holds combat *feel* (flocking weights, collision spacing, render sizes) next to the loop it tunes.

`data/`: `pacing.ts` (every clock), `economy.ts`, `units.ts` (stat curves, summon prices, unit colours), `workshop.ts`, `dungeons.ts`, `upgrades.ts`, `relics.ts`, `gacha.ts`, `squadNames.ts`.

`rules/`: `derived.ts`, `loot.ts`, `fight.ts`, `travel.ts`, `units.ts`, `summoning.ts`, `workshop.ts`, `relics.ts`, `gacha.ts`, `unlocks.ts`, `resources.ts`, `describe.ts`.

### The tick pipeline

`useGameLifecycle` is the only driver. Each 100ms interval it:

1. `store.tick(TICK_MS)` — an accumulator drains exact steps, calling `gameTick(state)`.
2. Instantiates a `CombatEngine` for any squad that just entered `fighting`.
3. Advances every live engine in `ENGINE_DT` steps and calls `resolveFight` on a winner.

`gameTick` (`src/game/tick.ts`) is pure: `GameState → Partial<GameState>`. It never mutates and never touches the engine.

All clock constants live in `data/pacing.ts` and nowhere else: `TICK_MS`, `TICKS_PER_SECOND`, `ENGINE_DT`, `TICKS_PER_DAY`, `TICKS_PER_AUTOSAVE`, `MAX_OFFLINE_MS`, `CATCHUP_THRESHOLD_MS`, `MAX_HEADLESS_TICKS`. Never write these as bare literals.

### `derived` is the central abstraction

`GameState.derived` projects *upgrades purchased + workshop levels + equipped relic affixes* into flat numbers the rest of the code reads (`maxSquadSize`, `bonesPerTick`, per-unit `hpFlat`/`dmgBonus`/…). Computed by `recomputeDerived()` in `rules/derived.ts`; **never persisted**.

Nothing recomputes it on a timer. Any action touching upgrades, workshop, or equipped relics must go through `withDerived` (`slices/helpers.ts`):

```ts
return withDerived(prev, { /* patch */ });
```

Skipping it yields stale stats that silently correct on the next unrelated action. Adding a stat means four edits: the `derived` type in `types.ts`, the matching `GlobalStatKey`/`UnitStatKey`/`DerivedFlagKey` union, its seed + return in `recomputeDerived`, and the consumer. A `global` stat also needs a label in `GLOBAL_LABELS` (`rules/describe.ts`).

`recomputeDerived` folds three sources **in order** — upgrade nodes, workshop levels, relics. The order is load-bearing: `pctOfSelf` takes a share of the running total, so relics must see a settled base.

### Combat is authoritative and lives outside game state

`CombatEngine` (`src/combat/engine.ts`) is a boids-style particle sim that *decides* dungeon outcomes. Engines live in `store.combatEngines`, a runtime-only `Map` (never saved, cleared on catchup). `resolveFight` converts survivor counts into squad composition, loot, and banners.

`CombatWindow.tsx` renders an engine and replays it locally for looping visuals once the fight is off the live map. It must never feed back into game state.

`src/combat/simulation.ts` is the hot loop (spatial hash, cell-aggregate flocking) — measure with the benchmark before restructuring. `config.ts` documents sane ranges per field; tune one value at a time.

Relic-granted **combat modifiers** (`lifesteal`, `regen`, `berserk`, `revive`, `vanguard`, `aura`, `overwhelm`, `executioner`, `spectral`, `lastStand`) are the back half of `UnitDerivedStats`; `UnitMods` picks them off that type so the two can't drift. `SimUnit.mods` is `null` for any unit carrying none — the fast path — and enemies never carry any. Anything knowable before the first tick (Group Tactics, the enemy debuffs) belongs in `dungeonCombat.ts`, not the loop. The benchmark measures the modifier cost at 500v500; keep `auraRadius` honest, since it is the one that widens the fine query.

### Offline catchup shares its rules, not its sequencing

`catchupOffline.ts` re-simulates up to `MAX_OFFLINE_MS` by jumping between squad events on a min-heap instead of stepping ticks, resolving fights headlessly with a cached, seeded engine.

Both paths call the same `rules/` functions: `generateLoot` (catchup passes a seeded `rand`), `depositLoot`, `accruePassive`, `effectiveTravelTicks`, `shouldAutoDeploy`, `resolveFightOutcome`, `checkUnlockConditions`, `accrueFreePulls`.

A rule the catchup has to **batch** must be exact over any span — one call for N ticks landing where N calls for one do. `accrueFreePulls` is written that way and `parityCheck` asserts the equality directly.

**A new rule touching travel, loot, fight resolution, or auto-deploy goes in `rules/` and is called from both sides.** Only sequencing may differ; `parityCheck.ts` verifies the two agree.

Two intentional deviations in `catchupOffline.ts`, both to preserve: it mutates its own clone (`cloneForCatchup`) for speed, and it uses seeded `mulberry32` so a mid-window refresh reproduces identical results.

### Data tables are declarative — effects included

`data/*.ts` are pure data and their string ids are the contract with logic. Effects are declared in the table, not switched on by id:

- **Upgrade nodes** carry `effects: UpgradeEffect[]`. Kinds: `global` (a scalar in `derived`, via `add`/`mult`/`pctOfSelf`), `unit` (one stat across listed unit types), `flag` (a boolean in `derived`), `slot` (opens a relic slot), `elsewhere` (combat owns it, or it isn't built). A node with no effect is a type error. `cost` is a `Partial<Resources>`, not a banner count.
- **Relic affixes** carry `effects: AffixEffect[]` in `AFFIX_DEFS`, magnitude coming off the roll. More than one entry makes a trade-off affix: every effect reads the same roll, and a negative `scale` turns part of it into a cost. A `minRarity` gates the affix out of every minor pool — the only route to one is a base naming it as `signatureAffixId`.
- **Dungeon unlocks** carry `unlock: UnlockRule` (`always`/`clears`/`allOfTier`), evaluated by `checkUnlockConditions`.

An `elsewhere` effect carries `where: "unimplemented"` unless it is genuinely read somewhere, plus a `note` describing the intent.

**All player-facing effect text is generated** by `rules/describe.ts` (`describeUpgradeEffects`, `describeAffixEffects`, `describeUnlock`, `describeCryptTrack`, `describeCryptLevel`). A node's `description` is optional qualitative colour — never restate a magnitude there.

**The upgrade tree has two ordering rules and nothing validates either at build time.** A node whose effect scales corpses, souls, or one unit type must sit downstream of the node that opens it, *in the same branch*, so it can never be bought while worth zero. And `prerequisites` must never name another branch's node: `sections.ts` omits a node with unmet prerequisites, which reads as progressive reveal within a branch but as a missing node across two — reach across by charging that branch's resource in `cost` instead (Zombie Rites charges corpses; Veiled Circle charges souls). Prerequisite ids must also round-trip. Upgrade nodes must not use `pctOfSelf`: upgrades are folded before workshop levels and iterated in *purchase order*, so a share of a running total depends on both.

### Persistence

`save.ts` serializes the `PERSISTED_KEYS` allowlist (never `derived`) under `necromancer_save_v1`, gated on `SAVE_VERSION`. `buildHydratedState()` spreads loaded data over defaults, so new fields get defaults for free on old saves.

**Bump `SAVE_VERSION` when a save's meaning changes, not just its shape** — reusing an upgrade node id for a different effect is the case that bit us. A bump rejects older saves outright, which is what keeps hydration free of migration code. **Adding a persisted slice means adding it to `PERSISTED_KEYS` and nothing else** — that list drives writing, import validation, and the required-field check.

Import and reset are `persistenceSlice` actions, not direct `save.ts` calls, and both call `suspendPersistence()` first: the tick loop keeps running during the ~1s before reload and would otherwise overwrite the save just installed. Any new path that writes a save then reloads must suspend too.

### Store conventions

`store.ts` composes one Zustand store from five slice creators (`combat`, `squad`, `relic`, `progression`, `persistence`). Every slice is a `StateCreator` over the whole `StoreState` and may read anything via `get()`. Put a new action in the slice owning its state; only cross-cutting primitives go in `slices/helpers.ts` (`withDerived`, `applyUnitDelta`, `hasUnitsAvailable`, `withoutRelic`).

Actions are reducers: `set(prev => …)` returning a partial, immutable spread copies, early `return prev` to reject an invalid operation rather than throwing. Preconditions are checked at the top of the action, not by the caller.

`slices/types.ts` and the slice files import each other's types circularly. That's fine — every such import is `import type`.

## UI conventions

**One component per file, named after it** — including small presentational pieces only one parent renders.

**Split anything past ~200–300 lines**, unless it is genuinely one indivisible slice.

**`src/ui/components/` is organised by feature, one folder per screen** — `crypt/`, `reliquary/`, `ritual/`, `workshop/` — each holding that screen's components plus the pure helpers only it uses (`workshop/sections.ts`, `workshop/cost.ts`, `crypt/squadDisplay.ts`, `ritual/pools.ts`).

Two cross-cutting folders:

- **`common/`** — shared primitives: `Screen` (the `TopBar`/`.stage`/`TabBar` frame), `Modal`, `ConfirmAction` (also exports `DANGER_BUTTON`), `Meter`, `StatRow`, `EmptyState`, `SectionLabel`, `UnitDot`. **Look here before hand-rolling a dialog, confirm, meter, or eyebrow.**
- **`chrome/`** — app frame: `TopBar`, `TabBar` (sole owner of `TabId`, `TABS`, and `TAB_KEYS`), `ResourceReadout`, `CatchupOverlay`.

Shared helpers at `src/ui/`: `theme.ts` (`rarityColor`, `UNIT_COLORS`), `format.ts` (number/time formatters).

`src/ui/screens/` holds exactly four thin screens — store selectors, local UI state, layout composition. `Workshop.tsx` (~75 lines) is the shape to aim for. Default to presentational components taking data and callbacks as props; reaching for `useGameStore` inside a component is reserved for self-contained ones that would otherwise thread props through several layers (`TopBar`, `DispatchModal`, `RitualPanel`, `CombatWindow`).

**Unit colours come from `game/data/units.ts`**, re-exported as `UNIT_COLORS` — never a raw hex. The combat canvas can't read CSS variables, so the lookup is the only thing keeping canvas and DOM in agreement.

**Raster art lives in `src/ui/assets/<feature>/` and is imported**, so Vite hashes and verifies it (`src/vite-env.d.ts` supplies module types). Author art as white line work on transparency, grayscale+alpha, tinted at render time by masking a solid fill with the PNG's alpha (`RitualArt` is the example) — don't commit pre-coloured variants.

## Styling

**Tailwind is the target end state; everything else is migration debt.** `src/index.css` holds `:root` custom properties plus hand-written component classes; `tailwind.config.ts` mirrors the palette as named colors (`bone`, `coin`, `soul`, `bg-panel`, `r-legendary`, …).

1. **Use Tailwind utilities.** Don't add a class to `index.css` for anything Tailwind does trivially.
2. **Don't add inline `style={{…}}`.** The only legitimate use is a genuinely runtime-computed value (`width: ${pct * 100}%`); even then prefer an arbitrary-value utility. Static values in a `style` prop are a bug.
3. **Avoid `!`.** `index.css` classes are declared after `@tailwind utilities` and win at equal specificity — strip the property from the legacy class instead of escalating.
4. **New design tokens go in `tailwind.config.ts`**, not `:root`. While both exist, a palette change must update both.
5. Prefer Tailwind named colors over raw hex or `var(--…)` in markup.

Migrating a legacy class is expected cleanup when already editing that markup — convert it, delete the dead rule, check no other component uses it.

`.necro`, `.stage`, `.bar-top`, `.bar-tabs` are the load-bearing app frame; `.necro *` carries a typography cascade the whole UI inherits. Leave them alone unless that is the change.

Webfonts load from `<link>` tags in `index.html`; `index.css` must not re-`@import` them.

**Token divergence:** Tailwind's `rule` (`#1a1a1a`) and `rule-strong` (`#8a795b`) do **not** match `--rule`/`--rule-strong` (translucent warm hairlines), so `border-rule` and `border: 1px solid var(--rule)` render differently. Use `border-[color:var(--rule-strong)]` when an edit must preserve exact appearance; aligning them is a deliberate visual decision.

**Converting a `<div>` to a `<button>` needs `w-full`.** Form controls resolve `width: auto` as shrink-to-fit even at `display: block`, so the container collapses around its content — and a child at `width: 100%` makes it circular. Add `w-full` (and `text-left`) unless the element is a flex/grid *item*.

Screens are keyboard-routed from `App.tsx` (keys `1`–`4`), derived from each tab's `k` field in `TabBar`.

## Known rough edges

Not intentional design:

- Relic `upgradeLevel` and `duplicateCount` are read (affix boost, `×n` badge, fusion pips) but never written — there is no fusion or dedupe path, so that UI is inert.
- No relic sets. No base sets `set:`, so `RelicBase.set` and the card's set label never render.

Nothing is declared `elsewhere: "unimplemented"` today — grep `"unimplemented"` before assuming otherwise.
