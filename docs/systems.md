# Necromancer — Game Systems

## Resources

| Resource | Symbol | Primary Sources | Primary Sinks |
|----------|--------|-----------------|---------------|
| **Bones** | 🦴 | Passive generation (0.5/tick base), dungeon loot | Summon skeletons (10 each), Bone Ritual pulls (200/1800) |
| **Coins** | 🪙 | Dungeon loot (small amounts), relic affixes | Forbidden Ritual pulls (1500/13500) |
| **Souls** | 💀 | Dungeon loot (chance-based), kill affixes | Soul Ritual pulls (5/45), summon wraiths (20 bones + 1 soul) |
| **Dust** | ✦ | Sacrifice relics | — (currency for future systems) |
| **Corpses** | ☠ | Dungeon loot | Summon zombies (5 bones + 1 corpse) |

### Passive Rates (base, per tick at 10 Hz)

- **Bones**: 0.5/tick → 5/s → 300/min (before upgrades and relics)
- **Coins**: 0/tick base (relic-only source in early game)
- **Souls**: 0/tick base (drops only)

### Upgrade Modifiers

- `n1a` Bone Surge: ×1.5 bones/tick
- `n5a` Domain Expansion: ×1.25 bones/tick
- `n6` Forbidden Knowledge: ×1.05 bones/tick
- `n7` Apotheosis: ×3.0 bones/tick
- `s7` Crypt Lord: ×2.0 bones/tick

These multiply sequentially. With all necromancy and summoning capstones purchased, passive bone generation is 0.5 × 1.5 × 1.25 × 1.05 × 3.0 × 2.0 ≈ 5.9/tick.

Necrotic Surge (yield buff) doubles all passive resource income for its duration.

---

## Units

Three unit types, each with distinct HP, damage, and speed profiles.

| Unit | HP | DMG | Speed | Cost | Unlock |
|------|----|-----|-------|------|--------|
| **Skeleton** | 10 | 3 | 1.0 | 10 bones | Available from start |
| **Zombie** | 25 | 4 | 0.6 | 5 bones + 1 corpse | Upgrade `s2` (Zombie Unlock) |
| **Wraith** | 6 | 8 | 1.5 | 20 bones + 1 soul | Upgrade `s4b` (Wraith Unlock) |

**Damage-per-HP rationale**: Skeletons are balanced; zombies are tanky but deal less damage per HP; wraiths are glass cannons with the highest DPS-to-HP ratio.

Dungeon combat applies incoming damage to the weakest unit type first (wraith → skeleton → zombie order), so mixed compositions spread damage more effectively.

---

## Squads

### Composition

A squad holds any mix of skeletons, zombies, and wraiths up to `derived.maxSquadSize` (base: 5, raised by upgrades). The player configures the composition in the Dispatch Modal before sending a squad out.

Upgrade `s3b` (Bone Knight) requires note: the +15% group tactics bonus from `c3b` triggers when the squad carries all 3 unit types.

### States

```
idle ──dispatch──► traveling ──arrival──► fighting ──dungeon cleared or wiped──► returning
                                                    ──cooldown active──────────► returning
returning ──position reaches 0──► idle ──(auto-deploy if c0)──► traveling
```

| State | Position | Effect |
|-------|----------|--------|
| `idle` | 0 | Squad sits at crypt, available for dispatch |
| `traveling` | 0→1 | Moving toward dungeon along bezier path |
| `fighting` | — | Dealing and taking damage each tick |
| `returning` | 1→0 | Moving back; deposits `pendingLoot` on arrival |

**Travel speed** = `1 / dungeonDef.travelTimeTicks` per tick, multiplied by `derived.surgeSpeedMultiplier` and (on return) `1 + derived.squadReturnSpeedBonus`.

### Naming

Squads are given a name on creation (default in store: "Coldfingers"). The Dispatch Modal allows editing the name before dispatch.

### Squad HP Tracking

Each squad tracks `currentHp` per unit type independently. Living unit count = `ceil(currentHp[type] / hpPerUnit)`. When `currentHp[type]` reaches 0, all units of that type are dead. Full wipe (all HP = 0) causes retreat with `pendingLoot = null` (no loot on retreat).

### Max Squads

| Source | Bonus |
|--------|-------|
| Base | 3 |
| `s3a` Bigger Circles | +1 |
| `s5a` Triple Circle | +1 |
| `s6` Endless March | +2 |
| `c5a` Squad Synergy | +1 |
| `c6` War Cry | +1 |

Maximum reachable: 3 + 1 + 1 + 2 + 1 + 1 = **9 active squads**.

---

## Dungeons

Five dungeons across three tiers, unlocked progressively.

| Dungeon | Tier | HP Pool | DPS | Travel (ticks) | Cooldown | Position |
|---------|------|---------|-----|----------------|----------|----------|
| Pauper's Tomb | 1 | 300 | 5 | 80 | 300 (30s) | NW corner |
| Wolf Den | 1 | 400 | 8 | 100 | 300 (30s) | NE corner |
| Abandoned Chapel | 1 | 350 | 6 | 90 | 300 (30s) | E edge |
| Watcher's Spire | 2 | 800 | 18 | 150 | 600 (60s) | N center |
| Ossuary of Vael | 3 | 2000 | 45 | 240 | 1200 (120s) | SE area |

### Unlock Conditions

- **Pauper's Tomb**, **Wolf Den**, **Abandoned Chapel**: Unlocked from the start.
- **Watcher's Spire**: Unlocked when total tier-1 clear count ≥ 3 (across all three tier-1 dungeons combined).
- **Ossuary of Vael**: Unlocked after Watcher's Spire is cleared at least once.

### Loot Tables

| Dungeon | Bones | Coins | Corpses | Soul Chance |
|---------|-------|-------|---------|-------------|
| Pauper's Tomb | 20–40 | 5–15 | 2–4 | 3% |
| Wolf Den | 30–50 | 3–10 | 3–5 | 3% |
| Abandoned Chapel | 15–30 | 15–30 | 2–4 | 3% |
| Watcher's Spire | 80–120 | 30–60 | 6–10 | 8% |
| Ossuary of Vael | 200–350 | 100–180 | 15–25 | 15% |

### Clear Bonus

Each subsequent clear of the same dungeon increases loot by a logarithmic multiplier:

```
clearBonus = 1 + log(clearCount + 1) × 0.2
```

After 10 clears: ≈1.48×. After 100 clears: ≈1.92×. This rewards repeated farming of the same dungeon.

### Upgrade Points

Clearing a dungeon grants `tier` upgrade points:
- Tier-1 dungeons: 1 point per clear
- Tier-2 (Watcher's Spire): 2 points per clear
- Tier-3 (Ossuary of Vael): 3 points per clear

### Combat Formula

Each tick (100ms):

**Squad → Dungeon damage:**
```
aliveCount[type] = floor(currentHp[type] / (baseHp × (1 + hpBonus[type])))
squadDamage = Σ aliveCount[type] × baseDmg[type] × damageBonus[type] × 0.1
```

**Dungeon → Squad damage:**
```
dungeonDamage = dungeonDef.dps × 0.1
```
Applied to unit types in order: wraith first, then skeleton, then zombie (weakest per-unit HP first).

Squads deal damage once per tick. The dungeon "heals" back to full HP when its cooldown expires (HP is reset on clear, then cooldown counts down).

---

## Necrotic Surge

The Surge is a short-term power buff on a shared cooldown.

### Parameters

| Parameter | Value |
|-----------|-------|
| Cooldown | 900 ticks (90 seconds) |
| Max charges | 3 (base; +1 with `n4b` Lich Form) |
| Buff duration | 180 ticks (18 seconds) |
| Buff multiplier | ×2 to selected resource category |

### Buff Types

| Buff | Effect |
|------|--------|
| **Yield** | All dungeon loot ×2 and passive bones ×2 for duration |
| **Speed** | All squad travel speed ×2 for duration |
| **Damage** | All squad damage ×2 for duration |

### Charge Mechanic

- Charges regenerate one at a time via the cooldown counter.
- After a charge is consumed, the cooldown restarts.
- If charges are below max when cooldown expires, a charge is granted and the cooldown restarts immediately for the next charge.
- When `c7` (Necrotic Command) is purchased, the game auto-activates the surge with the **damage** buff whenever all charges are full and no buff is active.

### UI

The NecroticSurge component shows a radial ring (SVG `stroke-dashoffset`) counting down the cooldown, three pip indicators for charges, and an ACTIVATE button that opens a buff-type selection.

---

## Upgrade Tree

The tree has three branches. Each branch starts from a root node and descends through 6 tiers, culminating in a capstone node (tier 6, cost 900–1200 points).

### How Points Are Earned

- Clear any dungeon → earn `tier` upgrade points.
- Points accumulate in `upgrades.availablePoints`.
- Purchasing a node costs its listed point value immediately.

### Branch Overview

#### Summoning Branch (s0 – s7)

Focuses on squad capacity and unit effectiveness.

| Node | Cost | Key Effect |
|------|------|------------|
| s0 | 50 | +2 max squad size |
| s1a | 75 | -20% summon cost |
| s1b | 100 | +15% skel dmg, +10% skel HP |
| s2 | 120 | **Unlock Zombies** |
| s3a | 160 | +1 max squads |
| s3b | 240 | +20% skel dmg, 10% crit |
| s4a | 280 | +2 max squad size |
| s4b | 320 | **Unlock Wraiths** |
| s5a | 420 | +1 max squads |
| s5b | 480 | 15% chance fallen units revive as skeletons |
| s6 | 620 | +2 max squads, +3 squad size |
| s7 ★ | 900 | All unit stats +25%, bones/tick ×2 |

#### Command Branch (c0 – c7)

Focuses on squad behavior, tactics, and combat efficiency.

| Node | Cost | Key Effect |
|------|------|------------|
| c0 | 50 | **Auto-Deploy** |
| c1a | 80 | +10% all damage |
| c1b | 100 | +20% dmg, -10% HP |
| c2 | 140 | +20% HP, -10% dmg |
| c3a | 180 | 5% HP regen on arrival |
| c3b | 220 | +15% dmg with 3+ unit types |
| c4a | 260 | +30% return speed, retreat at 25% HP |
| c4b | 320 | 10% lifesteal |
| c5a | 400 | +1 max squads |
| c5b | 450 | +30% dmg first 30s per dungeon run |
| c6 | 600 | +1 max squads, all stats +10% |
| c7 ★ | 900 | Auto-Surge at full charges, +25% all combat |

#### Necromancy Branch (n0 – n7)

Focuses on resource income, relic utility, and Surge amplification.

| Node | Cost | Key Effect |
|------|------|------------|
| n0 | 60 | +50% soul drop chance |
| n1a | 90 | bones/tick ×1.5 |
| n1b | 140 | +15% zombie dmg |
| n2 | 180 | +5% HP regen/tick while fighting |
| n3a | 240 | +20% drop rate |
| n3b | 280 | +1% soul chance/tier |
| n4a | 360 | 1 free Bone Ritual pull/day |
| n4b | 420 | +1 surge charge, +50% buff duration |
| n5a | 520 | +30% yields, bones/tick ×1.25 |
| n5b | 580 | Relic pulls get +1 rarity tier chance |
| n6 | 720 | Relic affixes +20%, sacrifice dust ×2 |
| n7 ★ | 1200 | bones/tick ×3, all relic affixes +50% |

### Prerequisites Graph

Each node requires all listed prerequisites to be purchased first. Cross-branch dependencies exist via the node definitions in `src/game/data/upgrades.ts`.

---

## Auto-Save

- The game auto-saves to `localStorage` under key `necromancer_save_v1` every **50 ticks (5 seconds)**.
- The `derived` object is excluded from saves and recomputed fresh on load.
- On version mismatch, a reset confirmation prompt appears rather than silently corrupting state.
