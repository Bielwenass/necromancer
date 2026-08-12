# Combat

Combat is a boids-style particle simulation, and it **decides** dungeon outcomes — it is not decoration.

| File | Role |
|---|---|
| `combat/engine.ts` | `CombatEngine` — spawn, tick, win detection, render, perf stats |
| `combat/simulation.ts` | Hot loop: flocking, separation, targeting, damage, integration |
| `combat/spatialHash.ts` | Uniform-grid neighbour queries |
| `combat/config.ts` | All tuning constants, heavily annotated with usable ranges |
| `combat/renderer.ts` | Canvas draw (trails, dots, death flashes) |
| `combat/dungeonCombat.ts` | Arena size, player colors, `buildAttackerConfig` |
| `combat/prng.ts` | `mulberry32` — seeded determinism |
| `combat/benchmark.ts` | Headless perf harness (`bunx tsx src/combat/benchmark.ts`) |

## How a fight resolves

1. A travelling squad reaches position 1 in `gameTick`; state becomes `fighting` and a `fightSeed` is drawn.
2. `useGameLifecycle` sees the state change and builds a `CombatEngine`, side `a` from `buildAttackerConfig(squad.composition, derived)` and side `b` from `DUNGEON_DEFS[id].enemies`.
3. The engine advances in 16 ms steps each 100 ms game tick, scaled by `derived.combatSpeedMultiplier`. It is stored in `store.combatEngines`, keyed by squad id.
4. When `getWinner()` is non-null, `store.resolveFight` applies it: on a win, survivor counts become the squad's new composition, loot is generated, `clearCount` increments, the squad returns, and the dungeon's `tier` is awarded as banners. On a loss or draw the squad is removed entirely — the offline catchup does the same.

There is no fight timer and no dungeon HP pool — the simulation runs in real time and its result *is* the outcome.

`CombatWindow` renders whichever engine belongs to its squad. Once the fight leaves the store it keeps ticking that engine locally, restarting it every 1.5 s, purely as looping visuals. It must never feed back into game state.

## Unit stats

Attacker stats come entirely from `derived`, as `flat * (1 + bonus)` per unit type, where `flat` is the workshop base plus per-level gains from `UNIT_STAT_CONFIG` and `bonus` accumulates upgrades and relic affixes. Enemy stats are literal values on each dungeon's `enemies` array. Both live in code, not here — see `game/workshopUpgrades.ts` and `game/data/dungeons.ts`.

## Determinism

The engine takes an optional `seed`; with one it uses `mulberry32`, otherwise `Math.random`. Live fights seed from `squad.fightSeed`. Offline catchup derives its seed from `squadId|dungeonId|clearCount` so a mid-window refresh reproduces identical results.

## Performance

`simulation.ts` uses a cell-aggregate flocking model: cohesion and alignment are averaged over a 3×3 block of grid cells (O(1) per unit) instead of iterated per neighbour. Only separation and target selection do a fine-hash query, at `max(separationRadius, attackRadius)` — which makes those two radii the dominant per-tick cost.

Some `config.ts` fields are marked UNUSED, left over from that rewrite. Tune one value at a time: watch a 20v20 where individual behaviour is legible, then sanity-check 500v500 for emergent blob behaviour. Measure with the benchmark before restructuring; `engine.stats` breaks time down by sub-phase.

## Offline catchup

`game/catchupOffline.ts` resolves fights headlessly, capped at `MAX_HEADLESS_TICKS`, and caches outcomes per `dungeonId|composition` — but only for lossless wins, since those are the repeatable "always wins" case. It is a parallel implementation of the live rules; see [systems.md](systems.md#offline-catchup) for what must stay mirrored.
