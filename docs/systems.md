# Game Systems

Numbers live in `src/game/data/` and `src/game/workshopUpgrades.ts`. This file documents the rules; look up values in code so they can't go stale here.

## Resources

| Resource | Sources | Sinks |
|---|---|---|
| Bones | Garden plots (passive), dungeon loot, the dig button | Summons, workshop levels, Bone Ritual pulls, bone plot |
| Coins | Dungeon loot | Obol Ritual pulls, coin plot |
| Souls | Dungeon loot (chance-based) | Forbidden Ritual pulls, wraith summons, soul plot |
| Corpses | Dungeon loot | Zombie summons, corpse plot |
| Dust | Sacrificing relics | Dust plot |

Passive income is **garden-only**: `bonesPerTick = (Σ plot baseYield × level) / 10 × bonesPassiveMult`. There is no flat base rate. `bonesPassiveMult` is the product of the upgrades that multiply it (`n1a`, `n5a`, `n6`, `n7`, `s7`). `coinsPerTick` and `soulsPerTick` are structurally present but always 0.

`GARDEN_PLOTS` holds five plots. All of them grow **bones**; they differ in the resource that buys them — a plot's id *is* that resource (`garden.souls`), it is unlocked and upgraded for `baseCost × growth^level` of it, and `workshop.garden` is keyed the same way. Scarcer currencies buy a higher `baseYield`, which is what gives coins, souls, dust, and corpses a bones-side sink.

## Units

Three types — skeleton, zombie, wraith — with base HP/DMG/Speed in `UNIT_STAT_CONFIG`, raised per level in the Workshop. Zombies unlock via `s2`, wraiths via `s4b`; both cost bones plus a secondary resource. Summoning prices are in `game/summoning.ts`; `derived.summonCostBonus` discounts skeletons only.

A squad carries no HP between phases — only unit counts. Survivors from a fight become the squad's new composition, and a wipe destroys the squad outright.

## Squads

```
idle ──dispatch──► traveling ──arrive──► fighting ──engine reports winner──► returning ──► idle
                                                                        (or squad destroyed)
```

- Travel: `position += (1 / travelTimeTicks) × (1 + derived.squadTravelSpeedBonus)` per tick, and the mirror of that on the way back.
- On return, `pendingLoot` is deposited with yield bonuses applied, then unlock conditions are re-checked.
- With `c0` (Auto-Deploy), a returning squad re-dispatches to the same dungeon unless the player recalled it manually (`manualRecall`).
- Caps: `derived.maxSquadSize` (base 5) and `derived.maxActiveSquads` (base 1), both raised by upgrades and the Workshop.
- Only an `idle` squad can be disbanded. A squad in the field still holds its units, so refunding them mid-run would duplicate them.

## Dungeons

15 dungeons across 4 tiers, defined in `game/data/dungeons.ts`. Each has an enemy roster, a loot table, and a travel time; there is no HP pool or cooldown.

Unlocks are a hand-written dependency chain in `checkUnlockConditions` (`game/dungeons.ts`) — mostly "clear the previous dungeon 3 times" or "clear both branches". `unlockCondition` on the def is display text only; the switch is the real gate, and the two must be kept in sync by hand.

Repeat clears scale loot: `clearBonus = 1 + sqrt(clearCount + 1) × 0.07`. Clearing awards `tier` upgrade points.

## Workshop

Two upgrade surfaces share the Upgrades tab:

- **Skill tree** — one-time nodes, paid in upgrade points earned from clears.
- **Workshop** — repeatable levels paid in resources: per-unit HP/DMG/Speed, crypt squad size and travel speed, and the five garden plots. Costs grow geometrically (`base × growth^level`).

## Gacha

Three pools in `POOL_CONFIGS` (`game/gacha.ts`), each with rarity weights, a x1/x10 cost, an optional pity rarity + interval, and an x10 floor guarantee. Pity counters live in `gacha.pityCounters` and persist. See [relics.md](relics.md) for what a pull produces.

## Offline catchup

`game/catchupOffline.ts` re-simulates up to 8 hours of absence by jumping between squad events on a min-heap instead of stepping ticks, resolving fights headlessly with a seeded engine.

It deliberately duplicates the live rules, so **any change to travel time, fight resolution, loot, or auto-deploy must be mirrored there.** The pairs today:

| Live | Catchup |
|---|---|
| `generateLoot` (`tick.ts`) | `generateLootSeeded` |
| travel speed in `gameTick` | `computeTravelTime` |
| auto-deploy branch in `gameTick` | `returnArrive` case in `processEvent` |
| `checkUnlockConditions` | same, called on loot deposit |

Two intentional deviations from house style live in that file: it mutates its own cloned working state for speed, and it uses seeded `mulberry32` rather than `Math.random`. Keep both.

## Upgrade tree

Three branches (`s*` summoning, `c*` command, `n*` necromancy), 6 tiers each, ending in a capstone. Node definitions — cost, prerequisites, unlocks, description, tree position — are data in `game/data/upgrades.ts`; effects are `switch` cases in `recomputeDerived`.

**A node with no matching case does nothing.** Nodes whose effect lives elsewhere or isn't built yet are written as `case "x": break;` with a comment, so the tree stays auditable against the switch. Several descriptions currently promise unimplemented effects (`c3a`, `c3b`, `c4b`, `c5b`, `n2`, `n4a`, `n4b`, `s3b`, `s5b`) — check the switch before believing one.

## Save

Auto-save every 50 ticks to `necromancer_save_v1`, plus on tab hide. `derived` is excluded and recomputed on load. A version mismatch makes `loadGame` return `null` and the game starts fresh. Export/import are available in the settings modal; both import and reset suspend persistence before writing, so the still-running tick loop can't overwrite them before the reload. See [architecture.md](architecture.md#persistence).
