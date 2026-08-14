# Relics

Equippable items that feed `derived`. Obtained only from the Ritual of Calling
(gacha); can be equipped or sacrificed for dust.

Definitions live in `game/data/relics.ts` (`RELIC_BASES`, `AFFIX_DEFS`); rolling in
`game/rules/relics.ts`; affix application in `recomputeDerived`.

## Anatomy

A relic instance is a **base** + a **rarity** + one rolled **main affix** + 0–2
rolled **minor affixes** + an optional **signature affix**, plus a derived
`quality` and an `upgradeLevel` (0–5). Three affixes is the ceiling, so a card can
be read at a glance.

The base determines which slots accept it, its main affix id and range, its glyph,
and the pool its minors are drawn from. 22 bases across four slot families:

| Family | Slots | Bases |
|---|---|---|
| Crypt | C1, C2, C3 | 8 |
| Skeleton | I1, I2 | 5 |
| Zombie | II1, II2 | 4 |
| Wraith | III1, III2 | 5 |

## Rolling

Minor affix count by rarity: common 0, uncommon 1, rare 1, epic 2, legendary 2. A
base's signature displaces a minor, so three affixes is the ceiling at every
rarity.

Each affix rolls a position and interpolates its range:

```
pos   = Math.random() + POS_BOOST_RARITY[rarity]   // +0 / +0.1 / +0.2 / +0.35 / +0.5
value = min + (max - min) × pos
```

Because the rarity boost is added to a 0–1 roll, **`pos` can exceed 1 and values
can exceed the range maximum**. That is the intended payoff for high rarities.

Minors are drawn without replacement from the base's pool. A drawn minor matching
the base's main affix id folds into the main affix and takes no line of its own:
deliberate variance, and the only way a relic ends up exceptional at one stat, so a
rolled main value may legitimately exceed `mainAffixRange`. `quality` is the mean of
all roll positions × 100, signature included.

### Signatures and rarity gating

An affix with a `minRarity` is **gated**: it is filtered out of every minor pool,
and the only route to one is a base that names it as `signatureAffixId`. When such
a relic rolls at or above that rarity it gets the affix outright, into
`relic.uniqueAffix`, in place of one of its minors.

| Base | Signature | Gate | Effect |
|---|---|---|---|
| Hollow Crown | Dread Command | legendary | +1 max squads |
| Rib Cuirass | Lich Bond | legendary | skeletons revive once, at a share of max HP |
| Plague Stone | Bloodfeast | legendary | zombie lifesteal |
| Rot Censer | Death Aura | epic | zombies damage every enemy in reach |
| Ghost Cinder | Vanguard Drums | epic | wraith damage in the opening seconds |
| Mourner's Veil | Second Death | legendary | wraiths revive once, at a share of max HP |

This is what makes a legendary of a particular base worth chasing, and it is the
only place the strongest effects live.

## Applying affixes

`recomputeDerived` walks `relics.equipped` and applies main + minors + signature.
Every affix's targets are declared as `effects: AffixEffect[]` in `AFFIX_DEFS`;
nothing switches on an affix id:

```
value = rolled × (1 + upgradeLevel × 0.1) / 100
```

Each effect lands that value on a `derived` scalar (`global`) or a per-unit stat
(`unit`). `scale` multiplies it per effect, which is what makes **trade-off
affixes** possible: one roll, a positive effect at full scale and a negative one at
a fraction of it. Reckless Rites, Gravebound, Brittle Edge, Frenzied Rot and Hollow
Vessel are built this way, and `formatAffixValue` prints both halves (`+24% /
−12%`) so a card always shows the downside.

`scale` also carries the one flat affix: Dread Command rolls a `1` and scales by
100 to undo the percentage conversion.

Hovering an affix row on a relic card opens a tooltip built by
`describeAffixEffects` (`rules/describe.ts`), which walks the same `effects` array
and names the stat each half lands on, followed by the affix's `description`. It
rounds each magnitude the way `formatAffixValue` prints it, so the tooltip and the
stat row above it can't disagree.

Combat-facing affixes land on the combat modifier fields of `UnitDerivedStats`
(`lifesteal`, `regen`, `berserk`, `revive`, `vanguard`, `aura`, `overwhelm`,
`executioner`, `spectral`, `lastStand`), which the simulation reads per unit; see
[combat.md](combat.md#modifiers). The two enemy debuffs (`enemyHpPenalty`,
`enemyDmgPenalty`) are applied in `buildDefenderConfig`, outside the engine.

## Sacrifice

Sacrifice returns dust by rarity (1 / 2 / 5 / 10 / 30) and removes the relic from
any slot it occupies. It is the only way to dispose of a relic.

`sacrificeRelics(ids)` is the real action; `sacrificeRelic(id)` delegates to it. The
Reliquary's inventory filters (slot type × rarity, in `InventoryFilters`) drive a
bulk sacrifice of everything currently listed, behind a confirm step that any
filter change cancels. The list excludes equipped relics, so bulk sacrifice can
never take one out of a slot.

There is **no fusion**. `upgradeLevel` (0–5) is read when applying affixes and
displaying values, and nothing ever raises it above 0, so the
`× (1 + upgradeLevel × 0.1)` boost is always a no-op.

## Equipping

`equipRelic` rejects any slot missing from the relic's base, via
`canEquipInSlot(baseId, slotId)` in `game/rules/relics.ts`, which also rejects an
unknown `baseId`, and any slot missing from `derived.unlockedSlots`.

**Slots are bought.** `BASE_UNLOCKED_SLOTS` (C1, I1, II1, III1) are open from the
start; C2, C3, I2, II2 and III2 are each opened by a node in the necromancy branch
carrying a `{ kind: "slot" }` effect. A circle's slots stay hidden until its unit is
unlocked, so opening II1 costs nothing while zombies are still buried. A sealed slot
renders as `SEALED` in the Reliquary and its EQUIP button is disabled.

Equipping happens **only** from the EQUIP TO SLOT buttons in `RelicDetail`, which
are generated from `base.slotIds` and so can only ever offer valid targets. Clicking
an equipped slot selects that relic to inspect it; an empty slot is display-only.
The store guard is the backstop.

A save predating the guard may still hold a relic in a slot its base doesn't list.
Nothing corrects that on load, and affixes apply whatever the slot.

## Known gaps

- **Duplicates aren't merged.** `duplicateCount` is never incremented, so
  `InvCard`'s `×n` badge and `RelicDetail`'s `n/5 DUPES` pip row sit at zero.
