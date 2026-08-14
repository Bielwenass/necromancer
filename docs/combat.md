# Combat

Combat is a boids-style particle simulation, and it **decides** dungeon outcomes.

| File | Role |
|---|---|
| `combat/engine.ts` | `CombatEngine`: spawn, tick, win detection, render, perf stats |
| `combat/simulation.ts` | Hot loop: flocking, separation, targeting, damage, integration |
| `combat/spatialHash.ts` | Uniform-grid neighbour queries |
| `combat/config.ts` | Tuning constants, annotated with usable ranges |
| `combat/renderer.ts` | Canvas draw (trails, dots, death flashes) |
| `combat/dungeonCombat.ts` | Arena size, player colors, `buildAttackerConfig`/`buildDefenderConfig` |
| `combat/prng.ts` | `mulberry32`, seeded determinism |
| `combat/benchmark.ts` | Headless perf harness (`bunx tsx src/combat/benchmark.ts`) |

## How a fight resolves

1. A travelling squad reaches its `phaseEndTick` in `advance`; state becomes
   `fighting` and `fightSeed` derives from `dungeonId | composition | clearCount`.
2. `beginLiveFights` (`game/liveFights.ts`) builds a `CombatEngine` from that seed,
   side `a` from `buildAttackerConfig(squad.composition, derived)` and side `b`
   from `buildDefenderConfig(DUNGEON_DEFS[id], derived)`. It is stored in
   `store.combatEngines`, keyed by squad id.
3. `stepLiveFights` advances every engine by one game tick of sim time, scaled by
   `derived.combatSpeedMultiplier`. It runs before `beginLiveFights` each tick, so
   a new engine takes its first step on the tick after the one that started it,
   which makes a watched fight last exactly the `durationTicks` a headless run
   reports.
4. When `getWinner()` is non-null, `store.resolveFight` hands it to
   `applyFightResolution` (`game/advance.ts`): on a win, survivor counts become the
   squad's new composition, loot is generated, `clearCount` increments, and the
   squad walks the haul home. On a loss the undying reform and walk home
   empty-handed, and a squad with none is removed entirely. Offline catchup calls
   the same function.

The simulation runs in real time and its result is the outcome. Past
`MAX_FIGHT_MS` the engine calls the fight itself, for whichever side holds the
larger share of its starting muster (`leadingSide`). Both the live loop and the
catchup inherit that timer, so no squad can be stranded in `fighting`.

`CombatWindow` renders whichever engine belongs to its squad. Once the fight
leaves the store it keeps ticking that engine locally, restarting it after
`rendering.replayRestartDelayMs`, purely as looping visuals. It must never feed
back into game state.

## Unit stats

Attacker stats come entirely from `derived`, as `flat * (1 + bonus)` per unit type,
where `flat` is `base × statGrowth^level` from `UNIT_STAT_CONFIG` and `bonus`
accumulates upgrades and relic affixes.

Damage is dealt in discrete blows: a unit strikes its nearest target in reach every
`attackIntervalMs` for `dmg × interval`. Enemy stats are values on each dungeon's
`enemies` array; see `game/data/units.ts` and `game/data/dungeons.ts`.

Two things fold in outside the engine, in `dungeonCombat.ts`, both being knowable
before the first tick and so free to the simulation:

- **Group Tactics** multiplies attacker damage when the composition fields all
  three unit types.
- **Enemy debuffs** (`enemyHpPenalty`, `enemyDmgPenalty`) scale the defender
  roster. `buildDefenderConfig` rebuilds the roster, since `def.enemies` belongs to
  the dungeon table and must never be scaled in place.

## Contact

Steering and collision resolution meet at melee range, and the handoff between them
is deliberate.

A unit counts as **engaged** the moment an enemy is inside `attackRadius`, the same
test that gates a swing. An engaged unit drops to `engagedSeekScale` of its seek
weight and gains an `engagedDamping` drag. Seek is the one steering term large
enough to saturate the accel clamp alone, so at full weight in melee every
front-line unit drives into a target that phase 3 pushes straight back out, at
equal magnitude, every tick. That standoff is what jitter is.

Phase 3 closes the loop by absorbing `velocityAbsorb` of a contact's **closing
normal velocity** along with the positional push. A position-only correction leaves
the integrator aimed inward and the overlap re-forms next tick; taking the closing
component out lets a contact settle. Each pair is visited from both ends, so each
unit sheds its own share.

Together these keep an engaged unit's collision-driven motion to a few percent of
its total. That matters to the renderer as much as the sim: `CombatWindow`
extrapolates between game ticks from velocity alone, so displacement phase 3
applies behind velocity's back is motion the extrapolation must snap to.

## Modifiers

Beyond the stat line, a unit type carries up to ten **combat modifiers**, the
second half of `UnitDerivedStats`, granted by relic affixes. `unitMods()` collects
them per type and returns `null` when a type has none, which is the common case and
the one the hot loop is written for: `SimUnit.mods` is `null` and every modifier
check is skipped. Enemies never carry them.

| Modifier | Where it applies |
|---|---|
| `berserk` | damage multiplier, scaling with the attacker's own HP missing |
| `vanguard` | damage multiplier, while `t < openingWindowMs` |
| `overwhelm` | damage multiplier, from the 3×3 block's own/enemy counts (free, since flocking already computes them), capped by `overwhelmCap` |
| `executioner` / `spectral` | damage multiplier off the target's HP fraction; the fine query returns the `SimUnit`, so its HP is at hand |
| `lastStand` | damage multiplier once the side is below `lastStandThreshold` of `startCount` |
| `lifesteal` | heals the attacker by a share of damage actually dealt, so a swing at nothing heals nothing |
| `aura` | damages every enemy within `auraRadius`, in the neighbour loop |
| `regen` | heals a share of max HP per second, in the damage phase |
| `revive` | on lethal damage, restores a share of max HP once; the unit keeps its id and its place in the survivor count |

Every damage modifier is additive into a single multiplier, so stacking two can't
compound.

`aura` is the only one with a real cost: it widens the fine-query radius to
`auraRadius`, and only when `finalizeSpawn` saw one (`SimState.hasAura`), so a
fight without one queries at its usual radius. The benchmark measures all three
cases at 500v500; keep `auraRadius` honest against it.

## Determinism

The engine takes an optional `seed`; with one it uses `mulberry32`, otherwise
`Math.random`. Both paths seed from the same pure functions in `rules/seeds.ts`,
the fight from `dungeonId | composition | clearCount` and the loot from
`squadId | dungeonId | clearCount`, so the same clear plays out and pays the same
whether watched or replayed offline, and a mid-window refresh reproduces itself.
`clearCount` is in the fight key so a farmed dungeon varies its battles.

`CombatEngine.tick` always advances in whole `ENGINE_DT` steps and carries any
remainder into the next call. That makes the same seed produce the same fight
under any driver: the live loop feeds 100 ms per game tick, which is not a multiple
of the step, while headless callers feed exact steps and accumulate no carry.

## Performance

`simulation.ts` uses a cell-aggregate flocking model: cohesion and alignment are
averaged over a 3×3 block of grid cells, O(1) per unit. Only separation and target
selection do a fine-hash query, at `max(separationRadius, attackRadius)`, which
makes those two radii the dominant per-tick cost.

Tune one `config.ts` value at a time: watch a 20v20 where individual behaviour is
legible, then sanity-check 500v500 for emergent blob behaviour. Measure with the
benchmark before restructuring; `engine.stats` breaks time down by sub-phase.

## Offline catchup

`game/catchupOffline.ts` resolves fights headlessly, capped at
`MAX_HEADLESS_TICKS`, and caches outcomes per `dungeonId|composition` for lossless
wins, the repeatable "always wins" case. It drives the same `advance` the live tick
does, supplying a `FightDriver` that knows a fight's length up front. See
[systems.md](systems.md#offline-catchup).
