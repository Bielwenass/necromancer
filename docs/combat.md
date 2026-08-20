# Combat

Combat is a steering-and-collision particle simulation, and it **decides** dungeon
outcomes.

| File | Role |
|---|---|
| `combat/engine.ts` | `CombatEngine`: spawn, tick, win detection, render, perf stats |
| `combat/simulation.ts` | Hot loop: steering, separation, targeting, damage, integration |
| `combat/grid.ts` | `BucketGrid`: counting-sort neighbour cells, rebuilt per tick |
| `combat/config.ts` | Tuning constants, annotated with usable ranges |
| `combat/dials.ts` | Every numeric leaf of `COMBAT_CONFIG`, for the sweep and the tuning page |
| `combat/renderer.ts` | Canvas draw (dots, death flashes) |
| `combat/dungeonCombat.ts` | Arena size, player colors, `buildAttackerConfig`/`buildDefenderConfig` |
| `combat/prng.ts` | `mulberry32`, seeded determinism |
| `combat/benchmark.ts` | Headless perf harness (`bunx tsx src/combat/benchmark.ts`) |
| `src/tune/` | `tune.html`: armies, dials and live metrics, outside the game app |

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

Damage is dealt in discrete blows: a unit strikes the enemy it is committed to,
once it is inside its own `reach`, every `attackIntervalMs` for `dmg × interval`.
Reach comes from `UNIT_REACH` for the player's types and from an enemy's optional
`stats.reach`, defaulting to `attackRadius`; a type that outreaches the melee line
fights from the rank behind it. Enemy stats are values on each dungeon's `enemies`
array; see `game/data/units.ts` and `game/data/dungeons.ts`.

Two things fold in outside the engine, in `dungeonCombat.ts`, both being knowable
before the first tick and so free to the simulation:

- **Group Tactics** multiplies attacker damage when the composition fields all
  three unit types.
- **Enemy debuffs** (`enemyHpPenalty`, `enemyDmgPenalty`) scale the defender
  roster. `buildDefenderConfig` rebuilds the roster, since `def.enemies` belongs to
  the dungeon table and must never be scaled in place.

## Contact

Soft separation and hard contact are two readings of one distance, so one walk
produces both. Inside `separationRadius` a pair pushes apart as a force; inside the
smaller collision radius an enemy pair also books a **correction** into
`pushX/pushY` and `pushVx/pushVy`, which integration applies after the speed clamp
— a shove is a correction, not a unit outrunning its own speed. Booking it rather
than moving the unit on the spot keeps the walk free of position writes, so no
unit's separation depends on how far down the loop it sits.

Every term the walk produces is symmetric — the force, the correction, the crowd
counts, who is in contact with whom — so **a pair is tested once and both ends are
paid together**. Walking in grid order makes "once" cheap. The units after this one
in its own cell and the ones in the cell east of it are a single run in `order`,
and the row below is the other half of the block; west and north arrive when those
units take their own turn. That is two runs per unit rather than nine cell
lookups, and half the distances of testing every pair from both ends.

The correction carries `velocityAbsorb` of the contact's **closing normal
velocity** along with the positional push. A position-only correction leaves the
integrator aimed inward and the overlap re-forms next tick; taking the closing
component out lets a contact settle. Each pair is visited from both ends, so each
unit sheds its own share. Turning it off leaves mean penetration at 3% of the
radius rather than under 1%, and an engaged unit carrying 6 px/s rather than 4.

A unit counts as **engaged** the moment its target is inside its `reach`, the same
test that gates a swing. An engaged unit drops to `engagedSeekScale` of its seek
weight and gains an `engagedDamping` drag. Seek is normalised, so its magnitude is
exactly `seekWeight` and it is capped at `maxAccel`: it is the one steering term
that can saturate the turn budget alone, and capping it there is what keeps both
dials monotone rather than trading against each other inside the accel clamp. At
full weight in melee every front-line unit drives into a target the correction
pushes straight back out, at equal magnitude, every tick. That standoff is what
jitter is, and the drag is what holds an engaged unit near 4 px/s instead of 10.

That matters to the renderer as much as the sim: `CombatWindow` extrapolates
between game ticks from velocity alone, so displacement applied behind velocity's
back is motion the extrapolation must snap to.

## Modifiers

Beyond the stat line, a unit type carries up to nine **combat modifiers**, the
second half of `UnitDerivedStats`, granted by relic affixes. `unitMods()` collects
them per type and returns `null` when a type has none, which is the common case and
the one the hot loop is written for: `SimUnit.mods` is `null` and every modifier
check is skipped. Enemies never carry them.

| Modifier | Where it applies |
|---|---|
| `berserk` | damage multiplier, scaling with the attacker's own HP missing |
| `vanguard` | damage multiplier, while `t < openingWindowMs` |
| `overwhelm` | damage multiplier, from the own/enemy counts the separation walk passes anyway, capped by `overwhelmCap` |
| `executioner` / `spectral` | damage multiplier off the target's HP fraction; the held target's slot is at hand, so its HP is free |
| `lastStand` | damage multiplier once the side is below `lastStandThreshold` of `startCount` |
| `lifesteal` | heals the attacker by a share of damage actually dealt, so a swing at nothing heals nothing |
| `regen` | heals a share of max HP per second, in the damage phase |
| `revive` | on lethal damage, restores a share of max HP once; the unit keeps its id and its place in the survivor count |

Every damage modifier is additive into a single multiplier, so stacking two can't
compound.

Every one rides a loop that already runs, so a fight carrying modifiers costs
what a fight without them costs. The benchmark measures both cases at 500v500.

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

## Targeting

A unit picks one enemy once it is within `commitRadius` and holds it, by id, until
that enemy dies or somebody else walks into contact. Further off there is nothing
to hold: a whole cell steers at the enemy cell and arrives as a body, where
committing at range would fan the charge into as many threads as there are
enemies. `slotOfId` is what survives the swap-remove: the held id resolves to a
slot in one read, and a dead target resolves to -1, which is the whole validity
check.

**The man in front wins over the man you picked.** The pair walk runs under every
reach, so the nearest enemy it passes is one in contact, and that unit takes over
whenever the held target is dead, missing, or out of reach. It is the only thing
that breaks a hold, which settles three questions at once: an approach across open
ground is never called off half way, a screened target never leaves a unit
standing in a scrum not swinging, and a re-pick in a melee costs no search at all —
the walk already found the answer.

So the search is the exception, not the rule: about four units in a thousand run
one per tick. It rings outward over the steering grid from the unit's own cell, up
to `nearestMaxRings`, for the closest enemy-holding cell, then scans that cell for
its nearest enemy. Enemies already carrying enough damage to die this tick are
passed over, so a swarm spreads its blows instead of emptying into one corpse, but
only while a live one is in reach: idling beside a dying enemy costs more than the
overkill. The same check at the swing keeps the blow rather than banking it
against a body. With no cell in range a unit closes on the enemy's global centroid.

Distance in the ring search is measured in whole cells and the chosen cell is
cached per cell, since every unit standing in one searches the same rings. A cell
lying behind the unit costs `reverseBias` times as much, so a line does not turn
back through its own ranks for a marginally closer pocket. The search stops one
ring past its first hit, since a diagonal neighbour can beat a nearer ring's far
corner.

Holding a target concentrates damage: an enemy grinds down the one attacker it
holds instead of smearing blows across a shuffling front rank, so a clear that took
no losses may now cost one. That is the mechanic working, and it moves the AUTO
thresholds `balanceCheck` reports.

## Performance

Units live as parallel typed arrays (`SimUnits`), not objects. Slots are dense:
a death swaps the last live slot down, so an index is only valid within one tick
and slot order stops being spawn order after the first kill.

A tick allocates nothing. `BucketGrid` counting-sorts unit indices into
`cellStart`/`order` buffers it keeps, and the walk reads those cells directly
rather than asking for a result array, so each neighbour distance is computed once.

Two grids and one walk. The walk covers `max(separationRadius, collision radius)`,
where the collision footprint is `dotRadius × radiusPerDot + radiusMargin` scaled
by the inverse square root of the unit count past `radiusScaleRefCount`, so area
per unit stays roughly constant and a crowded field stays cheap; the renderer
scales dots by the same factor. The steering grid is the coarse one, sized by
`steerCellSize`, and only acquisition reads it.

That walk is where the time goes: around 70% of the accel phase, rising with
density, and its 3×3 block is three times the area of the circle it is testing, so
roughly a third of what it touches is inside the radius. Squeezing that ratio is
what the next round has to attack.

Timing is off unless asked for. `EngineOptions.stats` is `"off"` in the live game
and in catchup; `"phase"` costs a handful of timers a tick, `"detail"` six per unit
per tick, and the work counters (pairs, picks, swings) ride the same switch.
`bunx tsx src/combat/benchmark.ts` prints all of it: phase and grid splits, what
the walk saw against what it acted on, and the targeting and contact workloads.

Tune one `config.ts` value at a time: watch a 20v20 where individual behaviour is
legible, then sanity-check 500v500 for emergent blob behaviour. `tune.html` drives
both by hand with the metrics beside them; the benchmark's `sweep` prices every
dial at 0.1× and 10×.

## Offline catchup

`game/catchupOffline.ts` resolves fights headlessly, capped at
`MAX_HEADLESS_TICKS`, and caches outcomes per `dungeonId|composition` for lossless
wins, the repeatable "always wins" case. It drives the same `advance` the live tick
does, supplying a `FightDriver` that knows a fight's length up front. See
[systems.md](systems.md#offline-catchup).
