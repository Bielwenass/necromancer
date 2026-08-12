# Game Systems

Numbers live in `src/game/data/` and `src/game/workshopUpgrades.ts`. This file documents the rules; look up values in code so they can't go stale here.

## Resources

| Resource | Sources | Sinks |
|---|---|---|
| Bones | Garden plots (passive), dungeon loot, the dig button | Summons, workshop levels, Bone Ritual pulls, bone plot |
| Coins | Dungeon loot | Obol Ritual pulls, coin plot |
| Souls | Dungeon loot (chance-based) | Forbidden Ritual pulls, wraith summons, soul plot |
| Corpses | Per-kill drop chance in dungeons | Zombie summons, wraith workshop levels, corpse plot |
| Dust | Sacrificing relics | Wraith workshop levels, dust plot |
| Banners | Clearing a dungeon (`tier` per clear, online and offline) | Upgrade-tree nodes |

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

- Travel: `position += 1 / effectiveTravelTicks(def, derived.squadTravelSpeedBonus)` per tick, and the mirror of that on the way back. `game/travel.ts` owns that formula (`travelTimeTicks / (1 + bonus)`) and is the single source the live tick, the offline catchup, and the Crypt timers all read — so ETAs and the "Ns travel" label show the upgraded duration, not the base one.
- On return, `pendingLoot` is deposited with yield bonuses applied, then unlock conditions are re-checked.
- With `c0` (Auto-Deploy), a returning squad re-dispatches to the same dungeon unless the player recalled it manually (`manualRecall`).
- Caps: `derived.maxSquadSize` (base 5), raised by upgrades and the Workshop, and `derived.maxSquads` (base 1), raised by upgrades. `maxSquads` caps how many squads exist at all, regardless of state — it is checked in `createSquad` and never gates dispatching an existing one.
- Only an `idle` squad can be disbanded. A squad in the field still holds its units, so refunding them mid-run would duplicate them.

## Dungeons

15 dungeons across 4 tiers, defined in `game/data/dungeons.ts`. Each has an enemy roster, a loot table, and a travel time; there is no HP pool or cooldown.

Unlocks are a hand-written dependency chain in `checkUnlockConditions` (`game/dungeons.ts`) — mostly "clear the previous dungeon 3 times" or "clear both branches". `unlockCondition` on the def is display text only; the switch is the real gate, and the two must be kept in sync by hand.

Repeat clears scale loot: `clearBonus = 1 + sqrt(clearCount + 1) × 0.07`. Clearing awards `tier` banners.

**Corpses are not in the loot table.** They come off the kill count: every felled enemy rolls `CORPSE_DROP_CHANCE` (`tick.ts`) independently, so a dungeon's corpse yield is a function of its roster size, and `clearBonus` deliberately does not touch it. A win means side B is at zero, so the roll runs over the dungeon's whole roster (`dungeonEnemyCount`).

Loot is deposited on arrival home with the yield bonuses applied — `boneYieldBonus`, `coinYieldBonus`, `soulsYieldBonus`, `corpseYieldBonus` — and `soulHarvestBonus` multiplies the dungeon's `soulChance` at generation time (`effectiveSoulChance`, clamped to 1).

## Workshop

Every workshop section is a list of the same `WRow`, rendered by the same `UpgradeRow`/`UpgradeDetail` pair — skill branches, per-unit stats, crypt, and garden alike. A row is either **one-time** (`maxLevel: 1`) or **leveled** (`base × growth^level`, no ceiling). Both price in resources through `costFn`, so affordability, the cost column, and the cost block are one code path; `WRow.skill` survives only to say which store action buys the row, because the tree records purchases as ids while everything else records levels.

Per-unit stat levels are priced by unit, not by a single shared formula (`unitStatCost`): skeleton levels cost **bones only**, zombie levels cost bones plus corpses from level 5 and souls from level 15, and wraith levels cost **corpses, souls, and dust — never bones**. All three take their shape from the same `baseBones × growth^level` curve; the wraith's soul and dust lines stay linear in `level` because both resources are scarce by design.

`sections.ts` decides what a section shows: skill nodes with unmet prerequisites are omitted entirely rather than drawn as locked, and inscribed ones are moved below everything still purchasable, under a divider. So the top of a section is always what the player can act on.

## Gacha

Three pools in `POOL_CONFIGS` (`game/gacha.ts`), each with rarity weights, a x1/x10 cost, an optional pity rarity + interval, and an x10 floor guarantee. Pity counters live in `gacha.pityCounters` and persist. See [relics.md](relics.md) for what a pull produces.

## Offline catchup

`game/catchupOffline.ts` re-simulates up to 8 hours of absence by jumping between squad events on a min-heap instead of stepping ticks, resolving fights headlessly with a seeded engine.

It deliberately duplicates the live rules, so **any change to travel time, fight resolution, loot, or auto-deploy must be mirrored there.** The pairs today:

| Live | Catchup |
|---|---|
| `generateLoot` (`tick.ts`) | `generateLootSeeded` (both call `effectiveSoulChance` and `rollCorpses`) |
| travel speed in `gameTick` | `computeTravelTime` (both call `effectiveTravelTicks`) |
| auto-deploy branch in `gameTick` | `returnArrive` case in `processEvent` |
| yield bonuses on loot deposit in `gameTick` | `returnArrive` case in `processEvent` |
| banner award in `resolveFight` | `outboundArrive` case, on a win |
| squad deleted on a wipe in `resolveFight` | `outboundArrive` case, on a loss |
| `checkUnlockConditions` | same, called on loot deposit |

Two intentional deviations from house style live in that file: it mutates its own cloned working state for speed, and it uses seeded `mulberry32` rather than `Math.random`. Keep both.

## Upgrade tree

Three branches (`s*` summoning, `c*` command, `n*` necromancy), 6 tiers each, ending in a capstone. Node definitions — cost, prerequisites, unlocks, description, tree position — are data in `game/data/upgrades.ts`; effects are `switch` cases in `recomputeDerived`.

**A node with no matching case does nothing.** Nodes whose effect lives elsewhere or isn't built yet are written as `case "x": break;` with a comment, so the tree stays auditable against the switch. Several descriptions currently promise unimplemented effects (`c3a`, `c3b`, `c4b`, `c5b`, `n2`, `n4a`, `n4b`, `s3b`, `s5b`) — check the switch before believing one.

## Save

Auto-save every 50 ticks to `necromancer_save_v1`, plus on tab hide. `derived` is excluded and recomputed on load. A version mismatch makes `loadGame` return `null` and the game starts fresh.

A save is spread over the defaults in `buildHydratedState`, so a new **top-level** field gets its default for free — but a saved nested object (`resources`, `workshop`) replaces the default wholesale, so a new key inside one needs an explicit line there. `banners` is the worked example: it merges over the default resources and falls back to the legacy `upgrades.availablePoints` so saves predating the change keep their points. Export/import are available in the settings modal; both import and reset suspend persistence before writing, so the still-running tick loop can't overwrite them before the reload. See [architecture.md](architecture.md#persistence).
