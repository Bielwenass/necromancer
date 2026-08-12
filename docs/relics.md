# Relics

Equippable items that feed `derived`. Obtained only from the Ritual of Calling (gacha); can be equipped or sacrificed for dust.

Definitions live in `game/data/relics.ts` (`RELIC_BASES`, `AFFIX_DEFS`); rolling in `game/rules/relics.ts`; affix application in `recomputeDerived`.

## Anatomy

A relic instance = a **base** + a **rarity** + one rolled **main affix** + 0–3 rolled **minor affixes** + an optional **signature affix**, plus a derived `quality` and an `upgradeLevel` (0–5).

The base determines which slots accept it, its main affix id and range, its glyph, and the pool its minors are drawn from. 22 bases across four slot families:

| Family | Slots | Bases |
|---|---|---|
| Crypt | C1, C2, C3 | 8 |
| Skeleton | I1, I2 | 5 |
| Zombie | II1, II2 | 4 |
| Wraith | III1, III2 | 5 |

## Rolling

Minor affix count by rarity: common 0, uncommon 1, rare 2, epic 3, legendary 3.

Each affix rolls a position and interpolates its range:

```
pos   = Math.random() + POS_BOOST_RARITY[rarity]   // +0 / +0.1 / +0.2 / +0.35 / +0.5
value = min + (max - min) × pos
```

Because the rarity boost is added to a 0–1 roll, **`pos` can exceed 1 and values can exceed the range maximum** — that is the intended payoff for high rarities, not a bug.

Minors are drawn without replacement from the base's pool. If a drawn minor matches the base's main affix id, its value is folded into the main affix instead of being added as a separate line. `quality` is the mean of all roll positions × 100.

### Signatures and rarity gating

An affix with a `minRarity` is **gated**: it is filtered out of every minor pool, and the only route to one is a base that names it as `signatureAffixId`. When such a relic rolls at or above that rarity it gets the affix outright, into `relic.uniqueAffix`, on top of its normal minors.

| Base | Signature | Gate | Effect |
|---|---|---|---|
| Hollow Crown | Dread Command | legendary | +1 max squads |
| Rib Cuirass | Lich Bond | legendary | skeletons revive once, at a share of max HP |
| Plague Stone | Bloodfeast | legendary | zombie lifesteal |
| Rot Censer | Death Aura | epic | zombies damage every enemy in reach |
| Ghost Cinder | Vanguard Drums | epic | wraith damage in the opening seconds |

This is what makes a legendary of a particular base worth chasing over a better-rolled common one, and it is the only place the strongest effects live.

## Applying affixes

`recomputeDerived` walks `relics.equipped` and applies main + minors + signature. Every affix's targets are declared as `effects: AffixEffect[]` in `AFFIX_DEFS` — nothing switches on an affix id:

```
value = rolled × (1 + upgradeLevel × 0.1) / 100
```

Each effect then lands that value on a `derived` scalar (`global`), a per-unit stat (`unit`), or nothing (`elsewhere`). `scale` multiplies it per effect, which is what makes **trade-off affixes** possible: one roll, a positive effect at full scale and a negative one at a fraction of it. Reckless Rites, Gravebound, Brittle Edge, Frenzied Rot and Hollow Vessel are built this way, and `formatAffixValue` prints both halves (`+24% / −12%`) so a card can't advertise only the upside.

`scale` also carries the one flat affix: Dread Command rolls a `1` and scales by 100 to undo the percentage conversion.

Hovering an affix row on a relic card opens a tooltip built by `describeAffixEffects` (`rules/describe.ts`), which walks the same `effects` array and names the stat each half lands on, followed by the affix's `description`. It rounds each magnitude the way `formatAffixValue` prints it, so the tooltip and the stat row above it can't disagree.

**No affix is unimplemented.** Combat-facing affixes land on the combat modifier fields of `UnitDerivedStats` (`lifesteal`, `regen`, `berserk`, `revive`, `vanguard`, `aura`, `overwhelm`, `executioner`, `spectral`, `lastStand`), which the simulation reads per unit — see [combat.md](combat.md#modifiers). The two enemy debuffs (`enemyHpPenalty`, `enemyDmgPenalty`) are applied in `buildDefenderConfig`, outside the engine entirely.

## Sacrifice

Sacrifice returns dust by rarity (1 / 2 / 5 / 10 / 30) and removes the relic from any slot it occupies. It is the only way to dispose of a relic.

`sacrificeRelics(ids)` is the real action; `sacrificeRelic(id)` delegates to it. The Reliquary's inventory filters (slot type × rarity, in `InventoryFilters`) drive a bulk sacrifice of everything currently listed, behind a confirm step that any filter change cancels. The list excludes equipped relics, so bulk sacrifice can never take one out of a slot.

There is **no fusion**. `upgradeLevel` (0–5) is read when applying affixes and displaying values, but nothing ever raises it above 0, so the `× (1 + upgradeLevel × 0.1)` boost is always a no-op today.

## Equipping

`equipRelic` rejects any slot not listed on the relic's base, via `canEquipInSlot(baseId, slotId)` in `game/rules/relics.ts` — an unknown `baseId` is rejected rather than allowed through — and any slot not in `derived.unlockedSlots`.

**Slots are bought.** `BASE_UNLOCKED_SLOTS` (C1, I1, II1, III1) are open from the start; C2, C3, I2, II2 and III2 are each opened by a node in the necromancy branch carrying a `{ kind: "slot" }` effect. A circle's slots stay hidden until its unit is unlocked, so opening II1 costs nothing while zombies are still buried. A sealed slot renders as `SEALED` in the Reliquary and its EQUIP button is disabled.

Equipping happens **only** from the EQUIP TO SLOT buttons in `RelicDetail`, which are generated from `base.slotIds` and so can only ever offer valid targets. Clicking an equipped slot selects that relic to inspect it; an empty slot is display-only. The store guard is the backstop, not the mechanism.

Saves predating the guard may still hold a relic in a slot its base doesn't list. Nothing corrects that on load, and affixes apply regardless of slot.

## Known gaps

- **Sets don't exist.** No base sets `set:`, so `RelicBase.set` and `RelicCard`'s set label never render anything.
- **Duplicates aren't merged.** Every pull pushes a new inventory entry; `duplicateCount` is never incremented, so `InvCard`'s `×n` badge and `RelicDetail`'s `n/5 DUPES` pip row are permanently stuck at zero.
