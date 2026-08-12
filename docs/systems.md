# Game Systems

Every number lives in `src/game/data/` (combat feel excepted — that is `src/combat/config.ts`). This file documents the rules; look up values in code so they can't go stale here.

## Resources

| Resource | Sources | Sinks |
|---|---|---|
| Bones | Garden plots (passive), dungeon loot, the dig button | Summons, workshop levels, bone plot |
| Souls | Dungeon loot (chance-based), **once `soulsUnlocked`** | Forbidden Ritual pulls, wraith summons + unlock node, workshop levels, soul plot |
| Corpses | Per-kill drop chance in dungeons, **once `corpsesUnlocked`** | Zombie summons + unlock node, wraith workshop levels, Carrion Ritual pulls, corpse plot |
| Dust | Sacrificing relics | Wraith workshop levels, dust plot |
| Banners | Clearing a dungeon (`tier` per clear, plus `bannerChanceBonus`) | Upgrade-tree nodes, Banner Ritual pulls |

**The corpse and soul economies are gated.** A new necromancer's clears pay bones and banners and nothing else. `generateLoot` skips the corpse and soul rolls entirely until `derived.corpsesUnlocked` / `soulsUnlocked` are set, by the Grave Harvest and Soul Snare nodes; `projectLoot` projects zero to match, and the Crypt card and top bar simply don't quote a locked line. Both gates sit early in the necromancy branch, and the unit that spends each resource is priced in it — so neither unit can be unlocked before the economy feeding it exists.

Passive income is **garden-only**: `bonesPerTick = (Σ plot baseYield × level) / TICKS_PER_SECOND × bonesPassiveMult`. There is no flat base rate. `bonesPassiveMult` is the product of the upgrades that multiply it — Bone Garden and Apotheosis. `soulsPerTick` is structurally present but always 0.

`GARDEN_PLOTS` holds four plots. All of them grow **bones**; they differ in the resource that buys them — a plot's id *is* that resource (`garden.souls`), it is unlocked and upgraded for `baseCost × growth^level` of it, and `workshop.garden` is keyed the same way. Scarcer currencies buy a higher `baseYield`, which is what gives souls, dust, and corpses a bones-side sink.

## Units

Three types — skeleton, zombie, wraith — with base HP/DMG/Speed in `UNIT_STAT_CONFIG`, raised per level in the Workshop. Zombies unlock via Zombie Rites (`s4`), wraiths via Wraith Rites (`s9`); both cost bones plus a secondary resource, and both unlock *nodes* charge that same secondary resource on top of banners. Summon prices are in `data/units.ts` and charged by `rules/summoning.ts`; `derived.summonCostBonus` discounts skeletons only.

Prices scale with army size: the next unit of a type costs `base × e^(k·√owned)` (`summonScaling`, `k = 0.5`), where `owned` counts the reserve pool **plus** every unit already in a squad — otherwise forming a squad would walk the price back down. Scaling is per type, so raising skeletons doesn't make wraiths dearer. Wraith souls are exempt and stay at 1 apiece (`UNSCALED_COSTS`); every other resource in a summon cost scales. A batch of `count` is priced one unit at a time up the curve, so ten single raises and one `+10` cost the same. Nothing in the UI may hardcode a price — call `summonCost`, which is also what `summonUnits` charges.

A squad carries no HP between phases — only unit counts. Survivors from a fight become the squad's new composition, and a wipe destroys the squad outright.

**Undying units** (`UNDYING_TYPES` in `data/units.ts`, applied by `rules/units.ts`) ignore both of those rules: they are restored to their pre-fight count whatever the outcome, so a fight can only ever cost them time. Wraiths are the only ones today. A wiped squad that held any survives as a wraith-only remnant that walks home with no loot, no banner, and `manualRecall` set so auto-deploy doesn't march it back into the fight that just killed everyone else; a wiped squad with none is destroyed as before. `compositionAfterFight` is the single place that decides this, and both paths reach it through `resolveFightOutcome`.

## Squads

```
idle ──dispatch──► traveling ──arrive──► fighting ──engine reports winner──► returning ──► idle
                                                              (on a loss: destroyed, or the
                                                               undying return empty-handed)
```

- Travel: `position += 1 / effectiveTravelTicks(def, derived.squadTravelSpeedBonus)` per tick, and the mirror of that on the way back. `rules/travel.ts` owns that formula (`travelTimeTicks / (1 + bonus)`) and is the single source the live tick, the offline catchup, and the Crypt timers all read — so ETAs and the "Ns travel" label show the upgraded duration, not the base one.
- On return, `pendingLoot` is deposited with yield bonuses applied, then unlock conditions are re-checked.
- With Standing Orders (`c1`), a returning squad re-dispatches to the same dungeon unless the player recalled it manually (`manualRecall`). Recalling a squad that is *already* returning only sets that flag — it keeps its `pendingLoot`, since it finished the run; a squad pulled out of travel or a fight drops it.
- Each squad remembers the strength it was raised at in `roster`. `replenishSquad` drafts the shortfall back out of the reserves — idle squads only, capped by the pool and by `maxSquadSize`, and partial when the reserves are short. `replenishDelta` (`rules/units.ts`) computes it and the Crypt reads the same function for the `REFILL ×N` button. Nothing else writes `roster`, so reanimated units above it are a bonus rather than a new baseline.
- Caps: `derived.maxSquadSize` (base 5), raised by upgrades and the Workshop, and `derived.maxSquads` (base 1), raised by upgrades. `maxSquads` caps how many squads exist at all, regardless of state — it is checked in `createSquad` and never gates dispatching an existing one.
- Only an `idle` squad can be disbanded. A squad in the field still holds its units, so refunding them mid-run would duplicate them.

## Dungeons

15 dungeons across 4 tiers, defined in `game/data/dungeons.ts`. Each has an enemy roster, a loot table, and a travel time; there is no HP pool or cooldown.

Unlocks are **data**: each def carries an `unlock` rule — `always`, `clears` (every listed dungeon, N times each), or `allOfTier`. `checkUnlockConditions` (`rules/unlocks.ts`) evaluates it generically and `describeUnlock` (`rules/describe.ts`) renders the sentence the player reads, so the gate and its description cannot disagree.

Repeat clears scale loot: `clearBonus = 1 + sqrt(clearCount) × 0.07 × (1 + clearMultBonus)`, from `clearMultiplier` (`rules/loot.ts`), which the live roll, the catchup roll, and the UI all call. The Tomb Robber affix feeds `clearMultBonus`, steepening the curve rather than shifting it — so it pays nothing on a dungeon's first clear. Clearing awards `tier` banners, plus one more on a `bannerChanceBonus` roll.

**Corpses are not in the loot table.** They come off the kill count: every felled enemy rolls `CORPSE_DROP_CHANCE` (`data/economy.ts`) independently, so a dungeon's corpse yield is a function of its roster size, and `clearBonus` deliberately does not touch it. A win means side B is at zero, so the roll runs over the dungeon's whole roster (`dungeonEnemyCount`).

Loot is deposited on arrival home with the yield bonuses applied — `boneYieldBonus`, `soulsYieldBonus`, `corpseYieldBonus` — and `soulHarvestBonus` multiplies the dungeon's `soulChance` at generation time (`effectiveSoulChance`, clamped to 1). Past that clamp `soulsYieldBonus` is the only thing still paying, which is why a soul build wants both.

**Reanimation** (`derived.reanimateChance`) rolls once per unit lost on a clear and returns each hit as a skeleton, capped so the returning squad never exceeds `maxSquadSize`. It resolves in `resolveFightOutcome`, not the engine: a unit that dies mid-fight is genuinely gone from that battle.

`projectLoot` (`rules/loot.ts`) folds all of that — clear bonus, yield bonuses, soul harvest, corpse drop chance — into the payout a `DungeonCard` quotes, so the Crypt advertises what a run pays *this* necromancer rather than the bare loot table. It also reports the clear multiplier and each yield ratio alongside the figures, so the card's tooltips name the breakdown without inverting anything back out. Display-only, and it must track `generateLoot` plus `depositLoot`.

## Workshop

Every workshop section is a list of the same `WRow`, rendered by the same `UpgradeRow`/`UpgradeDetail` pair — skill branches, per-unit stats, crypt, and garden alike. A row is either **one-time** (`maxLevel: 1`) or **leveled** (`base × growth^level`, no ceiling). Both price in resources through `costFn`, so affordability, the cost column, and the cost block are one code path; `WRow.skill` survives only to say which store action buys the row, because the tree records purchases as ids while everything else records levels.

Per-unit stat levels are priced by unit, not by a single shared formula (`unitStatCost`): skeleton levels cost **bones only**, zombie levels cost bones plus corpses from level 5 and souls from level 15, and wraith levels cost **corpses, souls, and dust — never bones**. All three take their shape from the same `baseBones × growth^level` curve; the wraith's soul and dust lines stay linear in `level` because both resources are scarce by design.

`sections.ts` decides what a section shows: skill nodes with unmet prerequisites are omitted entirely rather than drawn as locked, and inscribed ones are moved below everything still purchasable, under a divider. So the top of a section is always what the player can act on.

## Gacha

Three pools in `POOL_CONFIGS` (`data/gacha.ts`) — Banner (banners), Carrion (corpses), Forbidden (souls) — each with rarity weights, a x1/x10 cost, an optional pity rarity + interval, and an x10 floor guarantee. Pity counters live in `gacha.pityCounters`, keyed by pool id, and persist.

The Dark Pact node feeds `derived.pityReduction`, and every read of an interval goes through `effectivePityInterval(poolId, reduction)` — the roll and the `PityMeter` both, so the bar can't promise a threshold the roll doesn't use. It floors at 1.

The Phylactery node grants free **banner-pool ×1** pulls: `accrueFreePulls` banks one per `FREE_PULL_INTERVAL_TICKS` up to `FREE_PULL_CAP`, and progress stops at the cap rather than banking a backlog. It is written to be batch-exact — one call for a thousand ticks lands where a thousand calls for one do — which is what lets the live tick and the offline catchup share it, and `parityCheck` asserts that equality directly. Charges are never spent on a ×10. Renaming a pool id therefore orphans the saved counters for it — `buildHydratedState` merges `pityCounters` over the defaults so the new ids start at zero rather than `undefined`, which is what the `bone`/`soul` → `banner`/`carrion` rename relied on. Weights are relative and normalised at roll time; the UI reads displayed percentages through `poolOdds()` rather than treating a weight as a percentage. See [relics.md](relics.md) for what a pull produces.

## Offline catchup

`game/catchupOffline.ts` re-simulates up to 8 hours of absence by jumping between squad events on a min-heap instead of stepping ticks, resolving fights headlessly with a seeded engine.

The two paths differ in **sequencing only** — 100 ms steps versus jumps between events — and share every rule through `rules/`:

| Rule | Both paths call |
|---|---|
| Loot roll | `generateLoot`, with catchup passing a seeded `rand` |
| Loot deposit | `depositLoot` |
| Passive income | `accruePassive` |
| Travel speed | `effectiveTravelTicks` |
| Auto-deploy | `shouldAutoDeploy` |
| Fight outcome, banners, wipes, reanimation | `resolveFightOutcome` |
| Unlocks | `checkUnlockConditions` |
| Free Ritual pulls | `accrueFreePulls` (catchup batches the whole window) |

Add a rule to `rules/` and call it from both sides rather than writing it twice — the hand-mirrored copies this table used to list are exactly what drifted.

Two intentional deviations from house style live in `catchupOffline.ts`: it mutates its own cloned working state for speed, and it uses seeded `mulberry32` rather than `Math.random`. Keep both.

`src/game/parityCheck.ts` (`bunx tsx src/game/parityCheck.ts`) is the guard. It asserts catchup's determinism, exact live/offline agreement over a fight-free window, structural agreement over a fight window, and the fight rule's own branches. Resource totals can't be compared directly across a fight window — the live path is deliberately non-deterministic.

## Upgrade tree

Three branches, 6 tiers each, ending in a capstone. Each owns a question: **summoning** (`s*`) is what you field, **command** (`c*`) is how they campaign, **necromancy** (`n*`) is what you reap and what you bind. Nodes are entirely data in `data/upgrades.ts` — cost, prerequisites, tier, and an `effects` list:

| Effect kind | Applies to |
|---|---|
| `global` | a scalar in `derived`, via `add`, `mult`, or `pctOfSelf` |
| `unit` | one stat across the listed unit types |
| `flag` | a boolean in `derived` |
| `slot` | opens a relic slot |
| `elsewhere` | nothing here — combat owns it, or it isn't built |

`recomputeDerived` folds them with one applier, so **there is no per-node code to forget**: a node with no effect is a type error, not a silent no-op. Relic affixes carry the same shape in `AFFIX_DEFS` (`data/relics.ts`), except that the magnitude comes from the roll rather than the data.

**No node is unimplemented.** Every declared effect is read somewhere.

Costs are a `Partial<Resources>`, priced through the same `canAffordCost`/`applyCost` as every other purchase, and climb roughly threefold per tier — a tier-1 node is a handful of clears, a capstone is a campaign.

Two ordering rules keep the tree honest:

- **An amplifier never precedes its enabler.** Anything scaling corpses, souls, or one unit type sits downstream of the node that opens it, *in the same branch*, so no node can be bought while it is worth zero. Soul Harvest behind Soul Snare is the worked example.
- **A cross-branch dependency is priced, not prerequisited.** `sections.ts` omits a node whose prerequisites are unmet, which reads as progressive reveal inside a branch and as a *missing* node across two. So Zombie Rites charges 25 corpses instead of requiring Grave Harvest: the node stays visible and its price names exactly what is missing. Wraith Rites (souls), Rotting Vessel (corpses), and Veiled Circle (souls) work the same way. `prerequisites` therefore never crosses a branch.

`pctOfSelf` is unused by upgrade nodes on purpose: `recomputeDerived` folds upgrades *before* workshop levels and iterates `purchased` in purchase order, so a share of a running total would depend on both. It belongs to relics, which are folded last.

Group Tactics is the one node that can be bought before it pays — it needs all three unit types, which no price can guarantee — so its `description` says so outright.

All player-facing effect text is generated from `effects` by `rules/describe.ts`. A node's `description` is optional qualitative colour only; **magnitudes must never be restated there**, and neither may an effect the generated line already states.

## Save

Auto-save every 50 ticks to `necromancer_save_v1`, plus on tab hide. `derived` is excluded and recomputed on load. A version mismatch makes `loadGame` return `null` and the game starts fresh.

A save is spread over the defaults in `buildHydratedState`, so a new **top-level** field gets its default for free — but a saved nested object (`resources`, `gacha`, `workshop`) replaces the default wholesale, so a new key inside one needs an explicit line there. `gacha.freePulls` is the worked example.

`SAVE_VERSION` is bumped when a save's *meaning* changes, not just its shape. Both bumps so far were upgrade-tree reworks that reused node ids for different effects: hydration has no migration code, so a stale id must be rejected outright rather than silently granting the wrong upgrade. Export/import are available in the settings modal; both import and reset suspend persistence before writing, so the still-running tick loop can't overwrite them before the reload. See [architecture.md](architecture.md#persistence).
