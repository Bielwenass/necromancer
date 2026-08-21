# CLAUDE.md

Conventions for this repo. Mechanisms live in [`docs/`](docs/):
[architecture](docs/architecture.md), [combat](docs/combat.md),
[systems](docs/systems.md), [relics](docs/relics.md).

## Commands

**Use Bun, never npm.**

```bash
bun run dev          # Vite dev server
bun run build        # tsc --noEmit && vite build
bun test             # the suite; `bun test parity` to narrow it
bun lint             # biome check --write: format, lint, organize imports
bunx tsc --noEmit    # typecheck alone, the fastest feedback loop
bunx tsx tools/bench/benchmark.ts      # combat perf breakdown; `sweep` prices every dial
bunx tsx tools/balance/balanceCheck.ts # simulated run: pacing, WIN/AUTO; takes a tier
bun run dev  →  /tools/tune/           # armies, config dials, live combat metrics
bun run dev  →  /tools/cardlab/        # relic card visuals, off the store
```

**Run `bun lint` and `bunx tsc --noEmit` after every change and fix everything
they report.** Those and `bun test` are the gates.

Tests are `*.test.ts` beside the code they cover, fixtures in `src/game/testing/`.
`parity.test.ts` must pass after any change to the tick, catchup, loot, or fight
rules; `balanceCheck.ts` takes a long time - run only after extensive changes to `data/` or the combat model, given
a tier while iterating and run whole at the end. It simulates a run rather than
assuming a build, so a price is as much its input as a stat line is.

## Code

- Biome owns formatting. Never hand-format against it, never reformat untouched
  code, and leave `biome.json` alone: when a rule doesn't fit, write a narrow
  `// biome-ignore lint/<rule>: <reason>`. Its one override that is policy rather
  than formatting is the `src/**` ban on importing `tools/`. `--unsafe` rewrites
  semantics; read that diff first.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
  are on; hence `void x` and `_`-prefixed params where a binding is kept.
- **Prefer a general system to a special case.** A member of a set the code knows
  about (a resource, unit type, rarity, affix) is handled by the table or the loop
  over it, with a neutral value where it differs. Derive values from a signal
  already carried: `kind`, a stat key, a table entry.

### Comments and docs

A comment earns its place by stating a non-obvious effect, connection, or
invariant; if the code already says it, delete it. Comments describe current
behaviour only: no history, no changelog, no comparison against alternatives.
No "rather than", "instead of", "used to", "X, not Y".
Keep every line dry and terse; the same rule governs this file and `docs/`.
Aggressively contain the length of text content, more words = always strictly worse.
Do not use any special symbols when writing code or docs - em dashes, abundant
highlights with **, etc.
Balance numbers stay in `src/game/data/`, never copied into docs or UI.

## Layering (the hard rule)

`src/game/**` and `src/combat/**` contain **no React imports**; rendering lives in
`src/ui/**` and `App.tsx`. The UI reads state through `useGameStore` selectors and
calls store actions. Inside `src/game/`, `data/` imports nothing but `./types`, and
`rules/` holds pure functions over it, free of the store.

**`tools/` is not part of the app.** It may import `src/`; `src/` may never import
it, which Biome enforces. Nothing there ships: only `index.html` is a build input,
and each tool page is its own Vite entry.

**Do not read `tools/` unless the task is about a tool.** Nothing in it drives game
behaviour, so it answers no question about the game and only crowds the context.
Changing a signature `tools/` consumes is the one case that pulls it in: fix the
call there, and let `bunx tsc --noEmit` find it rather than going looking.

## Simulation

- **`data/` is the only place to retune the game.** Any literal a designer would
  change (cost, rate, chance, cap, duration, coefficient, starting value) belongs
  there. `src/combat/config.ts` is the one exception, holding combat feel beside
  the loop it tunes; change one of its values at a time.
- **Every clock constant lives in `data/pacing.ts`.** Never a bare literal.
- **Every squad transition lives in `advance`**, or the state machine forks.
- `advance` mutates only the draft it is handed, never `derived`, and never reads
  `Date.now()` or `Math.random()`; seed rolls through `rules/seeds.ts`.
- A phase is `phaseStartTick`/`phaseEndTick` in absolute ticks. Every new deadline
  is strictly in the future; a `fighting` squad carries no `phaseEndTick`.
- **A per-tick payout must be exact over a span**: one call for N ticks lands
  where N calls for one do. Anything else needs a deadline.
- Never hand-roll an `ENGINE_DT` loop; `CombatEngine.tick(deltaMs)` carries the
  remainder.
- Anything knowable before a fight's first tick (Group Tactics, enemy debuffs)
  belongs in `dungeonCombat.ts`, outside the loop. Benchmark `simulation.ts`
  before restructuring it, and never let `CombatWindow.tsx` feed back into state.

## `derived`

Any action touching upgrades, workshop, or equipped relics goes through
`withDerived` (`slices/helpers.ts`); skipping it leaves stale stats. Adding a stat
takes three edits: the `derived` type in `types.ts`, the matching
`GlobalStatKey`/`UnitStatKey`/`DerivedFlagKey` union, and its seed in
`recomputeDerived`, plus a `GLOBAL_LABELS` entry for a `global` stat.

## Data tables

`data/*.ts` are pure data and their string ids are the contract with logic.
Declare effects in the table; never switch on an id. **All player-facing effect
text is generated** by `rules/describe.ts`, so a `description` is optional colour
and never restates a magnitude.

Three unvalidated rules govern the upgrade tree: a node scaling corpses, souls, or
one unit type sits downstream of its enabler **in the same branch**;
`prerequisites` never crosses a branch, so reach across through `cost`; and no
node uses `pctOfSelf`.

## Persistence

- **Bump `SAVE_VERSION` whenever a save's shape changes.**
- **Adding a persisted slice means adding it to `PERSISTED_KEYS` and nothing
  else.** A field nested in a saved object needs a `buildHydratedState` default.
- A path that writes a save then reloads calls `suspendPersistence()` first, or
  the tick loop overwrites it.

## Store

- Put a new action in the slice owning its state; only cross-cutting primitives
  go in `slices/helpers.ts`.
- Actions are reducers: `set(prev => …)` returning a partial, immutable spread
  copies, early `return prev` to reject an invalid operation. Preconditions are
  checked at the top of the action, never by the caller.
- Slice files import each other's types circularly, always as `import type`.

## UI

- **One component per file, named after it**, and **split anything past ~200–300
  lines** unless it is one indivisible slice.
- **`src/ui/components/` is organised by feature, one folder per screen**, plus
  that screen's own helpers; `common/` holds shared primitives and `chrome/` the
  app frame. **Check `common/` before hand-rolling a dialog, meter, or eyebrow.**
- **Every clickable control is `common/Button`**, sized by `size` and coloured by
  `tone`; a runtime accent passes straight through as `tone`, and `selected`
  drives a toggle. A raw `<button>` is only for a whole clickable surface such as
  a card, row, or tab.
- Screens are thin: store selectors, local UI state, layout composition, with
  `Workshop.tsx` (~75 lines) the shape to aim for. Components take data and
  callbacks as props; reserve `useGameStore` for self-contained ones that would
  otherwise thread props through layers.
- **Unit colours come from `game/data/units.ts`**, re-exported as `UNIT_COLORS`,
  never a raw hex. The combat canvas cannot read CSS variables, so that lookup
  keeps canvas and DOM in agreement.

## Styling

**Tailwind is the target end state; everything else is migration debt.**
`src/index.css` holds `:root` custom properties plus legacy component classes;
`tailwind.config.ts` mirrors the palette as named colors.

1. **Use Tailwind utilities**, preferring named colors over hex or `var(--…)`.
2. **No inline `style={{…}}`** except for a runtime-computed value
   (`width: ${pct * 100}%`), preferring an arbitrary-value utility.
3. **Avoid `!`.** `index.css` classes are declared after `@tailwind utilities` and
   win at equal specificity; strip the property from the legacy class.
4. **New design tokens go in `tailwind.config.ts`**; while `:root` survives, a
   palette change updates both.
5. Webfonts load from `<link>` in `index.html`; never `@import`.

Converting a legacy class is expected cleanup when already editing that markup:
convert it, delete the dead rule, check nothing else uses it. `.necro`, `.stage`,
`.bar-top`, `.bar-tabs` are the app frame and `.necro *` carries the typography
cascade; leave them alone unless that is the change. Tailwind's
`rule`/`rule-strong` diverge from `--rule`/`--rule-strong`; use
`border-[color:var(--rule-strong)]` to preserve appearance.
