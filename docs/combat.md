# Necromancer — Combat System

## Overview

Combat is a boids-based particle simulation that determines the actual outcome of dungeon raids. When a squad arrives at a dungeon it transitions to `fighting` state; the game immediately runs the simulation headlessly (synchronously, ~1–5 ms) to produce a `CombatOutcome`. The outcome is stored on the squad and applied when the fight timer expires. A visual `CombatWindow` on the Crypt tab runs its own independent looping simulation so the player can watch.

System files:

| File | Role |
|---|---|
| `src/combat/dungeonCombat.ts` | Enemy definitions, `simulateBattle`, `buildAttackerConfig` |
| `src/combat/engine.ts` | `CombatEngine` — tick/render loop, win detection |
| `src/combat/tierA.ts` | Boids physics, combat resolution, spatial hash queries |
| `src/combat/renderer.ts` | Canvas rendering (trails, dots, death flashes) |
| `src/game/tick.ts` | Triggers simulation, drives fight timer, applies outcome |
| `src/demo/CombatWindow.tsx` | Self-contained visual canvas in the Crypt sidebar |
| `src/demo/DemoHarness.tsx` | Standalone test harness on Combat tab (key `6`) |

---

## How a Fight Resolves

1. Squad `traveling` → `fighting` (arrives at dungeon).
2. `tick.ts` calls `simulateBattle(attackerConfig, dungeonId)` — returns `{ winner, survivorsByType }`.
3. Result stored as `squad.combatResult`; timer set to `fightTotalTicks` (100 / 150 / 200 by tier).
4. Each game tick: `fightProgressTicks++`. If the squad is winning, dungeon HP is linearly animated toward 0 for visual feedback.
5. When `fightProgressTicks >= fightTotalTicks`, the outcome is applied:
   - **Win**: `composition` and `currentHp` updated to survivor counts; dungeon cleared; loot generated; squad returns.
   - **Loss / draw**: squad wiped (composition zero'd); no loot; squad retreats.

The visual `CombatWindow` runs a separate engine independently — it loops every 1.5 s and does not affect the game outcome.

---

## Simulation

`simulateBattle` drives a `CombatEngine` with a fixed synthetic delta of 16 ms/tick, capped at 1875 ticks (30 seconds). The engine is purely computational — `render()` is never called. Returns as soon as `getWinner()` is set.

**Attacker config** is built from `squad.composition` with derived HP/damage bonuses and surge multiplier applied. Base stats:

| Unit | HP | DPS | Speed |
|---|---|---|---|
| skeleton | 10 × (1 + hpBonus) | 10 × (1 + dmgBonus) × surge | 1.0 |
| zombie | 25 × (1 + hpBonus) | 8 × (1 + dmgBonus) × surge | 0.6 |
| wraith | 6 × (1 + hpBonus) | 20 × (1 + dmgBonus) × surge | 1.8 |

---

## Enemy Forces

Defined in `DUNGEON_ENEMY_DEFS` (`dungeonCombat.ts`). Each enemy type has independent `hp`, `dmg`, and `speed` tuned for the expected squad size at that point in progression.

### Pauper's Tomb — tier 1

*Freshly-turned grave scraps. Slow and fragile; beatable by 10 skeletons.*

| Type | Count | HP | DPS | Speed |
|---|---|---|---|---|
| graveling | 8 | 8 | 4 | 0.7 |
| shuffler | 4 | 12 | 6 | 0.5 |

### Wolf Den — tier 1

*Pack hunters. Speed advantage punishes lone skeletons; needs 15+ units or a zombie meatshield.*

| Type | Count | HP | DPS | Speed |
|---|---|---|---|---|
| wolf | 12 | 10 | 8 | 1.6 |
| alpha | 3 | 20 | 12 | 1.2 |

### Abandoned Chapel — tier 1

*Glass-cannon cultists backed by slow bruiser revenants. Requires either wraiths to burst cultists or enough volume to absorb the revenants' HP.*

| Type | Count | HP | DPS | Speed |
|---|---|---|---|---|
| cultist | 10 | 6 | 7 | 1.0 |
| revenant | 4 | 18 | 9 | 0.7 |

### Watcher's Spire — tier 2

*Iron-disciplined. Guards anchor the line; fast wardens shred wraiths. Needs 15+ units with a zombie vanguard.*

| Type | Count | HP | DPS | Speed |
|---|---|---|---|---|
| guard | 15 | 20 | 10 | 0.9 |
| warden | 8 | 12 | 18 | 1.5 |

### Ossuary of Vael — tier 3

*Elite undead lords. Liches burst wraiths; death knights stall for them. Needs 25+ diverse units with active damage bonuses.*

| Type | Count | HP | DPS | Speed |
|---|---|---|---|---|
| bone_warrior | 20 | 15 | 12 | 1.0 |
| lich | 4 | 8 | 30 | 0.6 |
| death_knight | 6 | 40 | 20 | 0.8 |

---

## Boids Forces

Each unit accumulates acceleration from four behaviours each tick, then integrates.

### Separation
Keeps friendly units apart. Inverse-distance formula spikes force when nearly touching without weakening in dense crowds:
```
strength = separationRadius / max(d, 0.5) - 1
acc -= dir_to_neighbour × strength × separationWeight
```
A weaker version (`enemySeparationWeight`) slows enemy interpenetration.

### Alignment
Steers toward the average velocity of nearby friendlies:
```
acc += (avgFriendlyVelocity - ownVelocity) × alignmentWeight
```

### Cohesion
Pulls toward the centroid of nearby friendlies:
```
acc += (friendlyCentroid - ownPosition) × cohesionWeight
```

### Seek (enemy pursuit)
Sums unit vectors toward all visible enemies and applies:
```
acc += normalize(sumOfDirections) × seekWeight
```
Falls back to a wider search radius, then to **global centroid march** (steering toward the mean position of all living enemies) when no enemy is visible locally.

---

## Combat (damage)

A unit attacks its nearest enemy within `attackRadius`. Damage is written to a `Map<unitId, damage>` — the **damage buffer** — so both sides deal damage simultaneously regardless of kill order. After all attacks are computed, the buffer is applied and dead units are removed.

---

## Hard Collision Resolution

After the physics integration step, a second spatial hash is built and overlapping enemy pairs are pushed apart:
```
push = (collRadius - d) / 2
u.x += (u.x - n.x) / d × push
```
`collRadius = dotRadius * 2 + 0.5` (≈ 4.5 px). Post-integration, so it always wins over accumulated forces.

---

## Death Flashes

Kill events generate brief flash particles (white → orange, 150 ms). The `EventQueue` uses two consumption cursors:

- `drain()` — consumed by the external caller
- `drainFlash()` — cursor-based slice consumed internally by the engine, without removing events from the main queue

This prevents re-processing the same kill event on subsequent ticks.

---

## Key Config (`src/combat/config.ts`)

| Constant | Value | Effect |
|---|---|---|
| `separationRadius` | 5 px | Minimum spacing between friendly units |
| `separationWeight` | 150 | Friendly push strength |
| `enemySeparationWeight` | 10 | Enemy push (slows penetration) |
| `alignmentRadius` | 20 px | Velocity-matching neighbourhood |
| `alignmentWeight` | 0.8 | Velocity-matching strength |
| `cohesionRadius` | 100 px | Group centering neighbourhood |
| `cohesionWeight` | 0.05 | Group centering strength |
| `seekRadius` | 800 px | Enemy detection range |
| `seekWeight` | 100 | Enemy pursuit force |
| `attackRadius` | 8 px | Melee range |
| `maxAccel` | 1000 px/s² | Acceleration cap |
| `speedScale` | 20 | `maxSpeed = stats.speed × speedScale` |
| `spatialCellSize` | 80 px | Spatial hash cell size |
| `deathFlashMs` | 150 ms | Flash particle lifetime |
| `trailAlpha` | 0.18 | Per-frame trail darkening |

---

## Tuning

Enemy stats live entirely in `DUNGEON_ENEMY_DEFS`. To make a dungeon harder: increase enemy count, HP, or DPS; raise speed to punish slow squads; add high-DPS glass-cannon types that target wraiths. The simulation is deterministic within a run (fixed dt) but has randomised spawn positions, so results vary slightly between raids — intentional roguelite variance.
