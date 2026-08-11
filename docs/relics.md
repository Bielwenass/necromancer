# Relics

Equippable items that feed `derived`. Obtained only from the Ritual of Calling (gacha); can be equipped or sacrificed for dust.

Definitions live in `game/data/relics.ts` (`RELIC_BASES`, `AFFIX_DEFS`); rolling in `game/relics.ts`; affix application in `recomputeDerived`.

## Anatomy

A relic instance = a **base** + a **rarity** + one rolled **main affix** + 0–3 rolled **minor affixes**, plus a derived `quality` and an `upgradeLevel` (0–5).

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

## Applying affixes

`recomputeDerived` walks `relics.equipped`, and for each relic applies main + minors through `applyAffix`:

```
boosted = value × (1 + upgradeLevel × 0.1) / 100
```

Affix ids are `switch` cases. `AFFIX_DEFS` marks each affix `implemented: true | false`; an unimplemented affix still rolls and still displays, but has no effect. Currently unimplemented: `rarityWeight` (wants gacha wiring), `dispatchBonus`, `firstStrikeBonus`, `overwhelm`, `berserk`, `lastStand`, `undyingFlesh`, `spectralStrike` (all want combat wiring), and `boneYieldFromKills` (needs reworking to per-kill). `corpseYield` and `soulOnKill` are fully wired now: `corpseYieldBonus` multiplies corpses on loot deposit, and `soulOnKill` feeds `soulHarvestBonus`, which multiplies a dungeon's soul chance. `soulOnKill` is still a misnomer — it scales the drop roll, not per-kill souls.

## Sacrifice

Sacrifice returns dust by rarity (1 / 2 / 5 / 10 / 30) and removes the relic from any slot it occupies. It is the only way to dispose of a relic.

`sacrificeRelics(ids)` is the real action; `sacrificeRelic(id)` delegates to it. The Reliquary's inventory filters (slot type × rarity, in `InventoryFilters`) drive a bulk sacrifice of everything currently listed, behind a confirm step that any filter change cancels. The list excludes equipped relics, so bulk sacrifice can never take one out of a slot.

There is **no fusion**. `upgradeLevel` (0–5) is read when applying affixes and displaying values, but nothing ever raises it above 0, so the `× (1 + upgradeLevel × 0.1)` boost is always a no-op today.

## Equipping

`equipRelic` rejects any slot not listed on the relic's base, via `canEquipInSlot(baseId, slotId)` in `game/relics.ts` — an unknown `baseId` is rejected rather than allowed through.

Equipping happens **only** from the EQUIP TO SLOT buttons in `RelicDetail`, which are generated from `base.slotIds` and so can only ever offer valid targets. Clicking an equipped slot selects that relic to inspect it; an empty slot is display-only. The store guard is the backstop, not the mechanism.

Saves predating the guard may still hold a relic in a slot its base doesn't list. Nothing corrects that on load, and affixes apply regardless of slot.

## Known gaps

- **Sets don't exist.** No base sets `set:`, so `RelicBase.set` and `RelicCard`'s set label never render anything.
- **Duplicates aren't merged.** Every pull pushes a new inventory entry; `duplicateCount` is never incremented, so `InvCard`'s `×n` badge and `RelicDetail`'s `n/5 DUPES` pip row are permanently stuck at zero.
