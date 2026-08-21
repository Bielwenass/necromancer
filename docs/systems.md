# Game Systems

Every number lives in `src/game/data/` (combat feel excepted, that being
`src/combat/config.ts`). This file documents the rules; look values up in code.

## Resources

| Resource | Sources | Sinks |
|---|---|---|
| Bones | Garden plots (passive), dungeon loot, the dig button | Summons, workshop levels, bone plot |
| Souls | Dungeon loot (chance-based), **once `soulsUnlocked`** | Forbidden Ritual pulls, wraith summons + unlock node, workshop levels, soul plot |
| Corpses | Per-kill drop chance in dungeons, **once `corpsesUnlocked`** | Zombie summons + unlock node, wraith workshop levels, Carrion Ritual pulls, corpse plot |
| Dust | Sacrificing relics | Wraith workshop levels, dust plot |
| Banners | Clearing a dungeon (`tier` per clear, plus `bannerChanceBonus`) | Upgrade-tree nodes, Banner Ritual pulls |

**The corpse and soul economies are gated.** A new necromancer's clears pay bones
and banners. `generateLoot` skips the corpse and soul rolls until
`derived.corpsesUnlocked` / `soulsUnlocked` are set by the Grave Harvest and Soul
Snare nodes; `projectLoot` projects zero to match, and the Crypt card and top bar
omit a locked line. Both gates sit early in the necromancy branch, and the unit
that spends each resource is priced in it, so neither unit unlocks before the
economy feeding it exists.

Passive income is **garden-only**:
`bonesPerTick = (Σ plot baseYield × level) / TICKS_PER_SECOND × bonesPassiveMult`.
`bonesPassiveMult` is the product of the upgrades that multiply it, currently
Apotheosis alone.

`GARDEN_PLOTS` holds four plots. All grow **bones** and differ in the resource that
buys them: a plot's id is that resource (`garden.souls`), it unlocks and upgrades
for `baseCost × growth^level` of it, and `workshop.garden` is keyed the same way.
Scarcer currencies buy a higher `baseYield`, giving souls, dust, and corpses a
bones-side sink.

## Units

Three types (skeleton, zombie, wraith) with base HP/DMG/Speed in
`UNIT_STAT_CONFIG`, raised per level in the Workshop. Zombies unlock via Zombie
Rites (`s4`), wraiths via Wraith Rites (`s9`); both cost bones plus a secondary
resource, and both unlock nodes charge that same secondary resource on top of
banners. Summon prices are in `data/units.ts` and charged by `rules/summoning.ts`;
`derived.summonCostBonus` discounts skeletons only.

Prices scale with army size: the next unit of a type costs `base × e^(k·√owned)`
(`summonScaling`, `k = 0.5`), where `owned` counts the reserve pool **plus** every
unit already in a squad, so forming a squad can't walk the price back down. Scaling
is per type. Wraith souls are exempt and stay at 1 apiece (`UNSCALED_COSTS`); every
other resource in a summon cost scales. A batch of `count` is priced one unit at a
time up the curve, so ten single raises and one `+10` cost the same. Nothing in the
UI may hardcode a price: call `summonCost`, which is what `summonUnits` charges.

A squad carries no HP between phases, only unit counts. Survivors from a fight
become the squad's new composition, and a wipe destroys the squad outright.

**Undying units** (`UNDYING_TYPES` in `data/units.ts`, applied by `rules/units.ts`)
are exempt from both rules: they are restored to their pre-fight count whatever the
outcome, so a fight can only cost them time. Wraiths are the only ones today. A
wiped squad that held any survives as a wraith-only remnant that walks home with no
loot, no banner, and `manualRecall` set so auto-deploy leaves it out of the fight
that just killed everyone else; a wiped squad with none is destroyed.
`compositionAfterFight` is the single place that decides this, and both paths reach
it through `resolveFightOutcome`.

## Squads

```
idle ──dispatch──► traveling ──arrive──► fighting ──engine reports winner──► returning ──► idle
                                                              (on a loss: destroyed, or the
                                                               undying return empty-handed)
```

- Travel: a squad carries `phaseStartTick` and `phaseEndTick`, absolute ticks, and
  arrives when `meta.tickCount` reaches the deadline. `travelLegTicks`
  (`rules/travel.ts`) owns the formula, `ceil(travelTimeTicks / (1 + bonus))`
  floored at one, and is the single source the live tick, the offline catchup and
  the Crypt timers all read, so ETAs and the "Ns travel" label show the upgraded
  duration. Absolute deadlines give "which squads transition at tick T" one answer
  both paths can ask. A leg already in flight keeps its deadline, so a travel-speed
  upgrade applies from the next one.
- A `fighting` squad has no `phaseEndTick`: a fight ends when it is decided.
  Nothing may record a fight as decided-but-unapplied, which makes a save taken
  mid-fight safe.
- On return, `pendingLoot` is deposited with yield bonuses applied, then unlock
  conditions are re-checked.
- With Standing Orders (`c1`), a returning squad re-dispatches to the same dungeon
  unless the player recalled it manually (`manualRecall`). Recalling a squad that
  is already returning only sets that flag and keeps its `pendingLoot`, the run
  being finished; a squad pulled out of travel or a fight drops it.
- Each squad remembers the strength it was raised at in `roster`.
  `replenishSquad` drafts the shortfall back out of the reserves: idle squads only,
  capped by the pool and by `maxSquadSize`, partial when the reserves are short.
  `replenishDelta` (`rules/units.ts`) computes it and the Crypt reads the same
  function for the `REFILL ×N` button. Nothing else writes `roster`, so reanimated
  units above it are a bonus.
- Caps: `derived.maxSquadSize` (base 5), raised by upgrades and the Workshop, and
  `derived.maxSquads` (base 1), raised by upgrades. `maxSquads` caps how many
  squads exist at all, whatever their state; it is checked in `createSquad` and
  never gates dispatching an existing one.
- Only an `idle` squad can be disbanded. A squad in the field still holds its
  units, so refunding them mid-run would duplicate them.

## Dungeons

Four tiers in `game/data/dungeons.ts`. Each has an enemy roster, a loot table, and
a travel time; there is no HP pool or cooldown.

Unlocks are **data**: each def carries an `unlockCondition`, every listed dungeon N
times each. `checkUnlockConditions` (`rules/unlocks.ts`) evaluates it generically
and `describeUnlock` (`rules/describe.ts`) renders the sentence the player reads,
so the gate and its description cannot disagree.

Repeat clears scale loot logarithmically in `clearCount`: `clearMultiplier`
(`rules/loot.ts`) is the one implementation, called by the live roll, the catchup
roll and the UI alike. The Tomb Robber affix feeds `clearMultBonus`, steepening the
curve, so it pays nothing on a first clear. Banners drop out of the same
`generateLoot` roll as everything else, `tier` per clear plus one on a
`bannerChanceBonus` roll, and travel home in `pendingLoot`. `depositLoot` banks
every resource in a haul, each scaled by its own yield bonus; banners and dust have
none.

**Corpses are not in the loot table.** They come off the kill count: every felled
enemy rolls `CORPSE_DROP_CHANCE` (`data/economy.ts`) independently, so a dungeon's
corpse yield is a function of its roster size, and `clearBonus` deliberately does
not touch it. A win means side B is at zero, so the roll runs over the dungeon's
whole roster (`dungeonEnemyCount`).

Loot is deposited on arrival home with the yield bonuses applied
(`boneYieldBonus`, `soulsYieldBonus`, `corpseYieldBonus`), and `soulHarvestBonus`
multiplies the dungeon's `soulChance` at generation time (`effectiveSoulChance`,
clamped to 1). Past that clamp `soulsYieldBonus` is the only thing still paying,
which is why a soul build wants both.

**Reanimation** (`derived.reanimateChance`) rolls once per unit lost on a clear and
returns each hit as a skeleton, capped so the returning squad never exceeds
`maxSquadSize`. It resolves in `resolveFightOutcome`, outside the engine: a unit
that dies mid-fight is gone from that battle.

`projectLoot` (`rules/loot.ts`) folds all of that (clear bonus, yield bonuses, soul
harvest, corpse drop chance) into the payout a `DungeonCard` quotes, so the Crypt
advertises what a run pays this necromancer. It also reports the clear multiplier
and each yield ratio alongside the figures, so the card's tooltips name the
breakdown without inverting anything back out. Display-only, and it must track
`generateLoot` plus `depositLoot`.

## Workshop

Every workshop section is a list of the same `WorkshopRow`, rendered by the same
`UpgradeRow`/`UpgradeDetail` pair: skill branches, per-unit stats, crypt, and
garden alike. A row is either **one-time** (`maxLevel: 1`) or **leveled**
(`base × growth^level`, no ceiling). Both price through `costFn`, so affordability,
the cost column, and the cost block are one code path. `skill` survives to say
which store action buys the row, the tree recording purchases as ids while
everything else records levels.

Per-unit stat levels are priced by unit (`unitStatCost`): skeleton levels cost
**bones only**, zombie levels cost bones plus corpses from level 5 and souls from
level 15, and wraith levels cost **corpses, souls, and dust**. All three take their
shape from the same `baseBones × growth^level` curve; the wraith's soul and dust
lines stay linear in `level`, both resources being scarce by design.

`sections.ts` decides what a section shows: skill nodes with unmet prerequisites
are omitted entirely, and inscribed ones move below everything still purchasable,
under a divider. The top of a section is always what the player can act on.

## Gacha

Three pools in `POOL_CONFIGS` (`data/gacha.ts`), Banner (banners), Carrion
(corpses) and Forbidden (souls), each with rarity weights, a x1/x10 cost, an
optional pity rarity + interval, and an x10 floor guarantee. Pity counters live in
`gacha.pityCounters`, keyed by pool id, and persist.

The Dark Pact node feeds `derived.pityReduction`, and every read of an interval
goes through `effectivePityInterval(poolId, reduction)`, the roll and the
`PityMeter` both, so the bar can't promise a threshold the roll doesn't use. It
floors at 1.

The Phylactery node grants free **banner-pool ×1** pulls: `accrueFreePulls` banks
one per `FREE_PULL_INTERVAL_TICKS` up to `FREE_PULL_CAP`, and progress stops at the
cap. It is batch-exact, one call for a thousand ticks landing where a thousand
calls for one do, which lets the live tick and the offline catchup share it;
`rules/gacha.test.ts` asserts that equality directly. Charges are never spent on a
×10.

Pity counters are keyed by pool id, so renaming a pool orphans its saved counter;
`buildHydratedState` merges `pityCounters` over the defaults, so a new id starts at
zero. Weights are relative and normalised at roll time, and the UI reads
percentages through `poolOdds()`. See [relics.md](relics.md) for what a pull
produces.

## Offline catchup

`game/catchupOffline.ts` re-simulates up to 8 hours of absence. It has no state
machine of its own: it calls `advance` (`game/advance.ts`), the same function the
live tick calls, and differs **only in pacing**, asking for the whole span to the
next `nextDeadline` where the live tick asks for one tick. Nothing paid across a
span varies within it (passive income is linear, free pulls are exact over any
span, and unlocks turn only on clear counts, which change only at the events
themselves), so a jump lands where stepping lands.

The one thing that genuinely differs is **who decides a fight is over**, and it is
the whole of the `FightDriver` interface. Offline (`HeadlessFights`) runs the
battle to completion on arrival, so it knows the end tick up front; live, the
player is watching and `squadSlice.resolveFight` applies the verdict when the
engine reports one. Both then call the same `applyFightResolution`.

That asymmetry is forced: a 100v100 fight is about a second of blocking JS and a
250v250 nearly four, so the live path cannot resolve one up front without freezing
the tab.

Add a rule to `rules/`, or a transition to `advance`, and both sides get it. Never
write it twice.

Three intentional deviations from house style live in the catchup path, all to
keep. It mutates its own cloned working state for speed. It resolves fights
headlessly. And `HeadlessFights` caches a result per `dungeonId|composition`,
deliberately omitting the `clearCount` the seed includes, bounded to lossless wins
where everyone survives whatever the seed and only the duration is borrowed.
Without it a farmed dungeon re-simulates every clear and an 8h window costs
minutes; `simulateOffline({ fightCache: false })` turns it off.

`src/game/parity.test.ts` (`bun test parity`) is the guard, and it drives the
shipped code. Every seed derives from persisted state, so it asserts **whole-state
equality** between the two paths across a fight window, plus catchup's determinism,
the split property (an offline window followed by a live one equals one straight
run), and that a window ending mid-fight banks nothing early. The rules it leans on
are covered beside them, in `rules/*.test.ts`; shared fixtures live in
`src/game/testing/scenario.ts`.

Two things cannot be exact, by construction: time beyond `MAX_OFFLINE_MS` is
forfeited, and a fight straddling the window boundary restarts, the engine's state
living outside `GameState`. The state stays consistent, with no double loot and no
double clear; the fight costs its duration again.

## Upgrade tree

Three branches, 6 tiers each, ending in a capstone. Each owns a question:
**summoning** (`s*`) is what you field, **command** (`c*`) is how they campaign,
**necromancy** (`n*`) is what you reap and what you bind. Nodes are entirely data in
`data/upgrades.ts`: cost, prerequisites, tier, and an `effects` list.

| Effect kind | Applies to |
|---|---|
| `global` | a scalar in `derived`, via `add`, `mult`, or `pctOfSelf` |
| `unit` | one stat across the listed unit types |
| `flag` | a boolean in `derived` |
| `slot` | opens a relic slot |

The Ritual and Reliquary tabs are two such flags: both sit on the bar inert until
First Rites (`n1`) opens them.

`recomputeDerived` folds them with one applier, so **there is no per-node code to
forget**: a node with no effect is a type error. Relic affixes carry the same shape
in `AFFIX_DEFS` (`data/relics.ts`), except that the magnitude comes from the roll.

Costs are a `Partial<Resources>`, priced through the same `canAffordCost` /
`applyCost` as every other purchase, and climb steeply per tier: a tier-1 node is a
handful of clears, a capstone is a campaign. The board is sized so the finite tree
completes late in tier 4, and `balanceCheck`'s pacing pass asserts both ends of
that against the banners a simulated run actually earns.
One node carries `repeatGrowth` and can be bought over and over at a rising price,
the tree being finite and a long run not.

Two ordering rules keep the tree honest:

- **An amplifier never precedes its enabler.** Anything scaling corpses, souls, or
  one unit type sits downstream of the node that opens it, **in the same branch**,
  so no node can be bought while it is worth zero. Soul Harvest behind Soul Snare
  is the worked example.
- **A cross-branch dependency is priced through `cost`.** `sections.ts` omits a
  node whose prerequisites are unmet, which reads as progressive reveal inside a
  branch and as a missing node across two. So Zombie Rites charges 25 corpses and
  requires nothing: the node stays visible and its price names exactly what is
  missing. Wraith Rites (souls), Rotting Vessel (corpses), and Veiled Circle
  (souls) work the same way. `prerequisites` therefore never crosses a branch.

`pctOfSelf` is unused by upgrade nodes on purpose: `recomputeDerived` folds
upgrades before workshop levels and iterates `purchased` in purchase order, so a
share of a running total would depend on both. It belongs to relics, folded last.

Group Tactics is the one node that can be bought before it pays, needing all three
unit types, which no price can guarantee, so its `description` says so outright.

All player-facing effect text is generated from `effects` by `rules/describe.ts`. A
node's `description` is optional qualitative colour; **magnitudes must never be
restated there**, and neither may an effect the generated line already states.

## Save

Auto-save every 50 ticks to `necromancer_save_v1`, plus on tab hide. `derived` is
excluded and recomputed on load. A version mismatch makes `loadGame` return `null`
and the game starts fresh.

A save is spread over the defaults in `buildHydratedState`, so a new **top-level**
field gets its default for free. A saved nested object (`resources`, `gacha`,
`workshop`) replaces the default wholesale, so a new key inside one needs an
explicit line there; `gacha.freePulls` is the worked example.

`SAVE_VERSION` is bumped whenever a save's meaning changes; reusing an upgrade
node id for a different effect forces it. Hydration has no
migration code, so a stale save is rejected outright. Export/import live in the
settings modal; both import and reset suspend persistence before writing, so the
still-running tick loop can't overwrite them before the reload. See
[architecture.md](architecture.md#persistence).
