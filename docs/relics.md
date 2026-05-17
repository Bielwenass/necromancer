# Necromancer — Relic System

## What Is a Relic?

A relic is an equippable item that modifies derived stats. Each relic has:

- A **base** (determines slot eligibility, main affix type, and minor affix pool)
- A **rarity** (common → uncommon → rare → epic → legendary)
- One **main affix** with a rolled value
- Zero to three **minor affixes**, each with a rolled value (count depends on rarity)
- A **quality** score (0–100) derived from all roll positions
- An **upgrade level** (0–5), increased through fusion

Relics are obtained exclusively through the Ritual of Calling (gacha). They can be equipped, sacrificed for dust, or fused in groups of five.

---

## Relic Bases

Twelve relic bases across four slot types. A relic can only be equipped in slots matching its slot type.

### Crypt Slots (C1, C2, C3) — 4 bases

| Base ID | Name | Main Affix | Set |
|---------|------|------------|-----|
| `marrow-halo` | Marrow Halo | Bone Generation +15–30% | Bonewalker |
| `bone-censer` | Bone Censer | Coin Income +10–25% | — |
| `pale-sigil` | Pale Sigil | Squad Return Speed +10–25% | — |
| `hex-lantern` | Hex Lantern | Drop Rate +15–35% | — |

Minor affix pool (Crypt): boneYield, coinYield, squadReturnSpeed, summonCost, dropRate, rarityWeight, surgeDuration

### Skeleton Slots (I1, I2) — 3 bases

| Base ID | Name | Main Affix | Set |
|---------|------|------------|-----|
| `coldring` | Coldring | Skeleton Damage +10–25% | Bonewalker |
| `shard-of-vael` | Shard of Vael | Skeleton Speed +15–30% | — |
| `femur-scepter` | Femur Scepter | Skeleton HP +15–30% | Bonewalker |

Minor affix pool (Skeleton): skeletonDamage, skeletonSpeed, skeletonHp, resurrectChance, boneYieldFromKills

### Zombie Slots (II1, II2) — 2 bases

Slots unlock when upgrade `s2` (Zombie Unlock) is purchased.

| Base ID | Name | Main Affix | Set |
|---------|------|------------|-----|
| `plague-stone` | Plague Stone | Zombie Damage +10–25% | Plaguebound |
| `husk-eye` | Husk Eye | Zombie HP +15–35% | Plaguebound |

Minor affix pool (Zombie): zombieDamage, zombieHp, plagueDuration, corpseYield, zombieAoe

### Wraith Slots (III1, III2) — 3 bases

Slots unlock when upgrade `s4b` (Wraith Unlock) is purchased.

| Base ID | Name | Main Affix | Set |
|---------|------|------------|-----|
| `wraith-lens` | Wraith Lens | Wraith Damage +15–35% | Ethereal |
| `ghost-cinder` | Ghost Cinder | Wraith Speed +15–30% | Ethereal |
| `soul-reed` | Soul Reed | Soul Chance on Kill +20–40% | Ethereal |

Minor affix pool (Wraith): wraithDamage, wraithSpeed, wraithHp, soulOnKill, phaseChance

---

## Affix Definitions

All 21 affix types with their display labels, units, and value ranges.

| Affix ID | Label | Unit | Range |
|----------|-------|------|-------|
| `boneYield` | Bone Generation | % | 5–35 |
| `coinYield` | Coin Income | % | 5–30 |
| `squadReturnSpeed` | Squad Return Speed | % | 5–25 |
| `summonCost` | Summoning Cost | % | 5–20 |
| `dropRate` | Drop Rate | % | 5–30 |
| `rarityWeight` | Rarity Weight | % | 3–15 |
| `surgeDuration` | Surge Duration | % | 5–25 |
| `skeletonDamage` | Skeleton Damage | % | 5–30 |
| `skeletonSpeed` | Skeleton Speed | % | 5–25 |
| `skeletonHp` | Skeleton HP | % | 5–30 |
| `resurrectChance` | Resurrect on Death | % | 2–10 |
| `boneYieldFromKills` | Bone Yield from Kills | % | 3–15 |
| `zombieDamage` | Zombie Damage | % | 5–25 |
| `zombieHp` | Zombie HP | % | 5–35 |
| `plagueDuration` | Plague Duration | % | 5–25 |
| `corpseYield` | Corpse Yield | % | 5–20 |
| `zombieAoe` | Zombie AoE Radius | % | 5–20 |
| `wraithDamage` | Wraith Damage | % | 5–35 |
| `wraithSpeed` | Wraith Speed | % | 5–30 |
| `wraithHp` | Wraith HP | % | 5–25 |
| `soulOnKill` | Soul Chance on Kill | % | 5–40 |
| `phaseChance` | Phase Through Chance | % | 3–15 |

---

## Roll Position Math

Every affix value is determined by a **roll position** in [0, 1].

### Center-Weighted Roll

```
rollPosition():
  if random() < 0.8:
    return 0.4 + random() × 0.2   // center band: 40%–60%
  else:
    return random()                // full range: 0%–100%
```

This means 80% of rolls land in the middle 20% of the range (resulting in average-tier values), while 20% can produce anything from the floor to the ceiling.

### Value Conversion

```
value = rangeMin + (rangeMax - rangeMin) × rollPosition
```

Example: `skeletonDamage` (range 5–30%). A roll position of 0.5 yields `5 + 25 × 0.5 = 17.5%`, rounded to 18%.

---

## Quality Calculation

Quality is the mean of all roll positions, scaled to 0–100 and rounded to the nearest integer.

```
allPositions = [mainRollPos, ...minorAffix rollPositions]
quality = round(mean(allPositions) × 100)
```

A quality of 50 represents a perfectly average relic. Quality 100 requires all affixes to roll at their ceiling — statistically very rare.

### Minor Affix Count by Rarity

| Rarity | Minor Affixes | Approx. Quality Range |
|--------|--------------|----------------------|
| Common | 0 | main affix position only |
| Uncommon | 1 | averaged over 2 rolls |
| Rare | 2 | averaged over 3 rolls |
| Epic | 3 | averaged over 4 rolls |
| Legendary | 3 | averaged over 4 rolls |

Higher rarity relics have more affixes, but the quality score is not inherently higher — it still depends on individual roll luck.

---

## Upgrade Level

Relics start at upgrade level 0 and can be fused up to level 5. Each upgrade level adds +10% to all affix values on that relic.

```
boostedValue = baseValue × (1 + upgradeLevel × 0.1)
```

A legendary relic at upgrade level 5 has all affixes at +50% above their rolled values.

---

## Fusion

### Trigger

Fusing requires **5 copies** of the same base + rarity combination in the inventory.

### Result

- The copy with the **highest quality** is kept and its upgrade level is incremented by 1 (capped at 5).
- The other 4 copies are removed from the inventory.
- The kept relic retains its exact roll positions and values — only the upgrade level changes.

```typescript
fuseRelics(inventory, baseId, rarity)
  → finds all dupes with matching baseId + rarity
  → sorts by quality descending
  → keeps dupes[0], removes dupes[1..4]
  → increments keeper.upgradeLevel by 1
```

If fewer than 5 copies exist, fusion fails silently and the inventory is unchanged.

---

## Sacrifice

Sacrificing a relic removes it from the inventory and grants **dust** equal to its rarity tier.

| Rarity | Dust Gained |
|--------|-------------|
| Common | 1 |
| Uncommon | 3 |
| Rare | 10 |
| Epic | 30 |
| Legendary | 100 |

With upgrade `n6` (Forbidden Knowledge) purchased, sacrifice dust is doubled.

Equipped relics cannot be sacrificed — they must be unequipped first.

---

## Set Bonuses

Three relic sets grant bonus effects when multiple pieces from the same set are equipped simultaneously.

### Bonewalker

Pieces: Marrow Halo, Coldring, Femur Scepter

| Equipped | Bonus |
|----------|-------|
| 2 pieces | +12% Skeleton Damage |
| 3 pieces | +25% Bone Drop Rate |

### Plaguebound

Pieces: Plague Stone, Husk Eye

| Equipped | Bonus |
|----------|-------|
| 2 pieces | Zombies leave plague pools (AoE damage field) |

### Ethereal

Pieces: Wraith Lens, Ghost Cinder, Soul Reed

| Equipped | Bonus |
|----------|-------|
| 2 pieces | Wraiths phase through walls (bypass dungeon defenses) |
| 3 pieces | +18% Wraith Speed |

Set completion is tracked in the Reliquary screen's bottom bar. A set piece displays its set name in the relic detail panel.

---

## Gacha Pools (Ritual of Calling)

Three pull pools, each with distinct odds, currency, and pity mechanics.

### Bone Ritual

- **Currency**: Bones
- **Cost**: 200 / pull, 1800 / 10-pull (10% discount)
- **Odds**: Common 70% | Uncommon 25% | Rare 5%
- **Pity**: None
- **x10 Guarantee**: At least 1 uncommon or better per 10-pull

### Soul Ritual

- **Currency**: Souls
- **Cost**: 5 / pull, 45 / 10-pull (10% discount)
- **Odds**: Common 30% | Uncommon 40% | Rare 25% | Epic 5%
- **Pity**: Guaranteed rare+ every 20 pulls (resets on natural rare+)
- **x10 Guarantee**: At least 1 rare or better per 10-pull

### Forbidden Ritual

- **Currency**: Coins
- **Cost**: 1500 / pull, 13500 / 10-pull (10% discount)
- **Odds**: Rare 30% | Epic 50% | Legendary 20%
- **Pity**: Guaranteed legendary every 50 pulls (resets on natural legendary)
- **x10 Guarantee**: At least 1 epic or better per 10-pull

### Pity Counter Behavior

The pity counter increments with each pull. When it reaches `pityInterval`, the next pull is forced to the `pityRarity` (or better) and the counter resets to 0. Rolling a natural result at or above the pity rarity also resets the counter.

Pity counters are persisted to `localStorage` — they do not reset on page reload.

### Base Selection

Within a given pull, the relic base is chosen **uniformly at random** from all 12 bases, regardless of rarity or pool. The rarity determines how many minor affixes are rolled, not which base is selected.

### Pull History

The last 50 pulls are stored in `gacha.pullHistory` and displayed in the Ritual screen's history panel. Session totals (pulls per pool since last page load) appear as a summary above the history.

---

## Equipping Relics

The Reliquary screen groups slots by circle:

- **The Crypt**: C1, C2, C3 (crypt-slot relics)
- **Circle I**: I1, I2 (skeleton-slot relics; always visible)
- **Circle II**: II1, II2 (zombie-slot relics; visible after `s2` purchased)
- **Circle III**: III1, III2 (wraith-slot relics; visible after `s4b` purchased)

A relic can be equipped into any slot that matches its base's slot type. Equipping or unequipping a relic triggers `recomputeDerived()` immediately, updating all combat and resource stats.
