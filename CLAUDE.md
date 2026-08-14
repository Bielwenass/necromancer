# CLAUDE.md

Guidance for Claude Code working in this repository.

## Commands

**Use Bun, never npm.**

```bash
bun run dev          # Vite dev server
bun run build        # tsc (typecheck, noEmit) && vite build
bun test             # the suite — `bun test parity` etc. to narrow it
bun lint             # biome check --write — format + lint + organize imports
bunx tsc --noEmit    # typecheck alone — fastest feedback loop
bunx tsx src/combat/benchmark.ts   # headless combat perf breakdown
bunx tsx src/game/balanceCheck.ts  # per-dungeon WIN/AUTO thresholds; add a tier number to narrow it
```

`bun test`, Biome and `tsc` are the automated gates. Tests are `*.test.ts` beside the code they cover, with shared fixtures in `src/game/testing/`; `parity.test.ts` is the online/offline guard and must pass after any change to the tick, catchup, loot, or fight rules.

`balanceCheck.ts` is a designer tool rather than a gate, but it must pass after any change to `data/dungeons.ts`, `data/units.ts`, or the combat model — it drives real fights, so pass it a tier (`balanceCheck.ts 2`) while iterating and run it whole before finishing.

## Workflow

**Run `bun lint` and `bunx tsc --noEmit` after every change and fix everything they report.** Zero diagnostics is the gate, not a goal.

- Biome owns formatting (tabs, double quotes, sorted imports). Never hand-format against it; don't reformat untouched code.
- `--write` is safe fixes only. `biome check --write --unsafe` rewrites semantics — read its diff before accepting.
- When a rule doesn't fit, use a narrow `// biome-ignore lint/<rule>: <reason>` rather than weakening `biome.json`.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` are on — hence `void x` and `_`-prefixed params where a binding is intentionally kept.

**Prefer a general system to a special case.** A member of a set the code already knows about — a resource, a unit type, a rarity, an affix — is handled by the table or the loop over that set, with a neutral value where it differs, not by a branch of its own. Likewise, derive a value from a signal already carried (`kind`, a stat key, a table entry) rather than passing a second field alongside it that can disagree with the first.

### Comments and docs

**Comments describe what the code does now** — short and to the point. A comment earns its place by explaining a non-obvious effect, connection, or reason; if the code already says it, delete it. Never narrate history ("used to be…", "replaced the old…", "this fixed a bug where…") — a comment is not a changelog. If the current behaviour needs justifying, state the invariant, not the story. Same rule applies to this file and `docs/`.

- Update CLAUDE.md in the same change whenever a convention here drifts from the code.
- **`docs/`** (`architecture.md`, `combat.md`, `systems.md`, `relics.md`) covers rules, invariants, and file roles. Keep it short — prune while you're there.
- Balance numbers live in `src/game/data/`, never duplicated into docs or UI strings.

## Architecture

An idle/incremental game: four React tabs over a fixed-timestep simulation, persisted to localStorage.

### Layering (the one hard rule)

`src/game/**` and `src/combat/**` contain **no React imports**. Rendering lives in `src/ui/**` and `App.tsx`. Logic reads nothing from the UI; the UI reads state through `useGameStore` selectors and calls store actions. This boundary is what makes the simulation runnable headlessly (offline catchup, benchmark, and the test suite all depend on it).

Inside `src/game/`:

```
data/      balance numbers only — imports nothing but ./types
rules/     pure functions over that data — no store, no React
slices/    store actions
testing/   fixtures shared by the test files
*.ts       state, tick, persistence, lifecycle
```

**`data/` is the only place to retune the game.** Any literal a designer would change — cost, rate, chance, cap, duration, curve coefficient, starting value — belongs there. The one exception is `src/combat/config.ts`, which holds combat *feel* (flocking weights, collision spacing, render sizes) next to the loop it tunes.

`data/`: `pacing.ts` (every clock), `economy.ts`, `units.ts` (stat curves, summon prices, unit colours), `workshop.ts`, `dungeons.ts`, `upgrades.ts`, `relics.ts`, `gacha.ts`, `squadNames.ts`.

`rules/`: `derived.ts`, `loot.ts`, `fight.ts`, `travel.ts`, `units.ts`, `squads.ts`, `seeds.ts`, `summoning.ts`, `workshop.ts`, `relics.ts`, `gacha.ts`, `unlocks.ts`, `resources.ts`, `describe.ts`.

### The tick pipeline

`useGameLifecycle` is the only driver. Each 100ms interval it:

1. `store.tick(TICK_MS)` — an accumulator drains exact steps, calling `gameTick(state)`.
2. `stepLiveFights` advances every live engine by one tick of sim time and `resolveFight` applies any winner.
3. `beginLiveFights` instantiates a `CombatEngine` for any squad that just entered `fighting` — **after** step 2, so a new engine's first step falls on the next tick. That is what makes a watched fight last exactly as many ticks as the headless run reports.

`gameTick` (`src/game/tick.ts`) is a pacer, not the simulation: it clones and calls `advance` for one tick. Both live fight helpers live in `src/game/liveFights.ts`, React-free so the parity tests drive the real path rather than a copy.

### `advance` is the simulation, and both paths call it

`advance(draft, toTick, fights)` (`src/game/advance.ts`) is the whole squad state machine — travel deadlines, arrival, fight resolution, loot deposit, the auto-deploy two-pass, the unlock sweep, tick and day counts. The live tick calls it for one tick; offline catchup calls it for the span to the next `nextDeadline`. **A transition written anywhere else is a bug**; that duplication is exactly what `parity.test.ts` exists to catch.

It mutates the draft it is handed (`cloneForAdvance`) and never `derived`. It must never read `Date.now()` or `Math.random()` — `lastTickAt` is stamped by `combatSlice.tick`, and every roll is seeded from persisted state via `rules/seeds.ts`.

A squad's phase is `phaseStartTick`/`phaseEndTick` in absolute ticks, never a fraction, so "which squads transition at tick T" has one answer. Two invariants hold it together: **every new deadline is strictly in the future** (`travelLegTicks` floors at 1, `durationTicks` at 1), so one pass settles a tick; and **a `fighting` squad carries no `phaseEndTick`**, so no state can say "decided but not applied" and a save taken mid-fight is safe.

All clock constants live in `data/pacing.ts` and nowhere else: `TICK_MS`, `TICKS_PER_SECOND`, `ENGINE_DT`, `TICKS_PER_DAY`, `TICKS_PER_AUTOSAVE`, `MAX_OFFLINE_MS`, `CATCHUP_THRESHOLD_MS`, `MAX_FIGHT_MS`, `MAX_HEADLESS_TICKS` (derived from `MAX_FIGHT_MS`). Never write these as bare literals.

### `derived` is the central abstraction

`GameState.derived` projects *upgrades purchased + workshop levels + equipped relic affixes* into flat numbers the rest of the code reads (`maxSquadSize`, `bonesPerTick`, per-unit `hpFlat`/`dmgBonus`/…). Computed by `recomputeDerived()` in `rules/derived.ts`; **never persisted**.

Nothing recomputes it on a timer. Any action touching upgrades, workshop, or equipped relics must go through `withDerived` (`slices/helpers.ts`):

```ts
return withDerived(prev, { /* patch */ });
```

Skipping it yields stale stats that silently correct on the next unrelated action. Adding a stat means three edits: the `derived` type in `types.ts`, the matching `GlobalStatKey`/`UnitStatKey`/`DerivedFlagKey` union, and its seed in `recomputeDerived` — the accumulators are spread into the result, so nothing has to be transcribed. A `global` stat also needs a label in `GLOBAL_LABELS` (`rules/describe.ts`).

`recomputeDerived` folds three sources **in order** — upgrade nodes, workshop levels, relics. The order is load-bearing: `pctOfSelf` takes a share of the running total, so relics must see a settled base.

### Combat is authoritative and lives outside game state

`CombatEngine` (`src/combat/engine.ts`) is a boids-style particle sim that *decides* dungeon outcomes. Engines live in `store.combatEngines`, a runtime-only `Map` (never saved, cleared on catchup). `resolveFight` hands the verdict to `applyFightResolution`, which converts survivor counts into squad composition, loot, and banners.

`tick(deltaMs)` always advances in whole `ENGINE_DT` steps and carries the remainder, so the same seed gives the same fight whatever the driver — the live loop feeds a non-multiple (100ms), while `balanceCheck` and `benchmark` feed exact steps and never accumulate a carry. Never hand-roll an `ENGINE_DT` loop in a caller; that is what used to make watched and headless fights differ.

`CombatWindow.tsx` renders an engine and replays it locally for looping visuals once the fight is off the live map. It must never feed back into game state.

`src/combat/simulation.ts` is the hot loop (spatial hash, cell-aggregate flocking) — measure with the benchmark before restructuring. `config.ts` documents sane ranges per field; tune one value at a time.

Relic-granted **combat modifiers** (`lifesteal`, `regen`, `berserk`, `revive`, `vanguard`, `aura`, `overwhelm`, `executioner`, `spectral`, `lastStand`) are the back half of `UnitDerivedStats`; `UnitMods` picks them off that type so the two can't drift. `SimUnit.mods` is `null` for any unit carrying none — the fast path — and enemies never carry any. Anything knowable before the first tick (Group Tactics, the enemy debuffs) belongs in `dungeonCombat.ts`, not the loop. The benchmark measures the modifier cost at 500v500; keep `auraRadius` honest, since it is the one that widens the fine query.

### Offline catchup shares its logic; only its pacing differs

`catchupOffline.ts` re-simulates up to `MAX_OFFLINE_MS` by calling `advance` for the span to each `nextDeadline` instead of stepping ticks. It has no state machine of its own.

Anything paid across a span must be **exact over that span** — one call for N ticks landing where N calls for one do. `accruePassive` is linear, `accrueFreePulls` is written for it (and `rules/gacha.test.ts` asserts the equality directly), and `checkUnlockConditions` turns only on clear counts, which change only at the events themselves. A new per-tick payout that is *not* span-exact breaks catchup silently, so give it a deadline instead.

The one legitimate asymmetry is **who decides a fight is over**, and it is the whole of the `FightDriver` interface. Offline (`HeadlessFights`) runs the battle on arrival and knows its end tick; live the answer arrives from the engine the player is watching. This is forced, not chosen: a 100v100 fight is ~1s of blocking JS and a 250v250 ~4s, so the live path cannot resolve one up front. Both then call the same `applyFightResolution`.

Three intentional deviations in the catchup path, all to preserve: it mutates its own clone (`cloneForAdvance`) for speed; it resolves fights headlessly; and `HeadlessFights` caches per `dungeonId|composition`, deliberately omitting the `clearCount` the seed carries — bounded to lossless wins, where only the duration is borrowed. Without it a farmed dungeon re-simulates every clear and an 8h window costs minutes. `simulateOffline({ fightCache: false })` turns it off, which is how the parity tests get an exact path.

`parity.test.ts` asserts **whole-state equality** between the two paths across a fight window — not a tolerance, because every seed is derived from persisted state. It also checks the split property (offline window then live window equals one straight run) and that a window ending mid-fight banks nothing early.

### Data tables are declarative — effects included

`data/*.ts` are pure data and their string ids are the contract with logic. Effects are declared in the table, not switched on by id:

- **Upgrade nodes** carry `effects: UpgradeEffect[]`. Kinds: `global` (a scalar in `derived`, via `add`/`mult`/`pctOfSelf`), `unit` (one stat across listed unit types), `flag` (a boolean in `derived`), `slot` (opens a relic slot). A node with no effect is a type error. `cost` is a `Partial<Resources>`, not a banner count.
- **Relic affixes** carry `effects: AffixEffect[]` in `AFFIX_DEFS`, magnitude coming off the roll. More than one entry makes a trade-off affix: every effect reads the same roll, and a negative `scale` turns part of it into a cost. A `minRarity` gates the affix out of every minor pool — the only route to one is a base naming it as `signatureAffixId`.
- **Dungeon unlocks** carry `unlockCondition`, evaluated by `checkUnlockConditions`.

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

**`src/ui/components/` is organised by feature, one folder per screen**, plus the pure helpers only it uses.

Two cross-cutting folders:

- **`common/`** — shared primitives: `Screen` (the `TopBar`/`.stage`/`TabBar` frame), `Modal`, `ConfirmAction` (also exports `DANGER_BUTTON`), `Meter`, `StatRow`, `EmptyState`, `SectionLabel`, `UnitDot`. **Look here before hand-rolling a dialog, confirm, meter, or eyebrow.**
- **`chrome/`** — app frame: `TopBar`, `TabBar` (sole owner of `TabId`, `TABS`, and `TAB_KEYS`), `ResourceReadout`, `CatchupOverlay`.

Shared helpers at `src/ui/`: `theme.ts` (`rarityColor`, `UNIT_COLORS`, `UNIT_LABELS`), `format.ts` (number/time formatters), `resources.ts` (`resourceMeta` — the icon, colour and label for a resource key, and `RESOURCE_KEYS` to iterate them). Per-unit-type icons are `UNIT_ICONS` in `components/icons`.

`src/ui/screens/` holds exactly four thin screens — store selectors, local UI state, layout composition. `Workshop.tsx` (~75 lines) is the shape to aim for. Default to presentational components taking data and callbacks as props; reaching for `useGameStore` inside a component is reserved for self-contained ones that would otherwise thread props through several layers (`TopBar`, `DispatchModal`, `RitualPanel`, `CombatWindow`).

**Unit colours come from `game/data/units.ts`**, re-exported as `UNIT_COLORS` — never a raw hex. The combat canvas can't read CSS variables, so the lookup is the only thing keeping canvas and DOM in agreement.

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

## Known rough edges

Not intentional design:

- Relic `upgradeLevel` and `duplicateCount` are read (affix boost, `×n` badge, fusion pips) but never written — there is no fusion or dedupe path, so that UI is inert.
