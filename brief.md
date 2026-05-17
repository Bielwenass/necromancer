# Necromancer — Prototype Build Brief

## Project

Build a playable prototype of an idle/incremental game called **Necromancer**. The player is a necromancer who dispatches autonomous squads of undead to raid dungeons. The player's role is allocation (which squads to which dungeons), progression (upgrades, equipped relics), and gacha (pulling for relics). Dark fantasy, parchment-and-bone aesthetic. References: Universal Paperclips, Unnamed Space Idle, Gnorp Apologue, Stuck in Time.

This is a prototype for design iteration. Core loop must be playable end-to-end. Content can be minimal; architecture matters more than polish.

## Reference materials

Five mockups attached (Crypt Map, Reliquary, Ritual of Calling, Upgrade Tree, Soul Codex). Approximate the aesthetic — black background, ivory/bone text, parchment-tan and ember-orange accents, occasional violet for souls/Phase indicators. Typography: serif headers (Cormorant Garamond or similar), monospace for numbers and small labels. Information-dense. Don't pixel-match; capture the feel.

## Tech stack

- **Vite + React 18 + TypeScript** (strict mode)
- **Zustand** for state management
- **Tailwind CSS** with a custom dark-fantasy theme
- **SVG** for the Crypt Map (dots, paths, dungeon nodes)
- **localStorage** for persistence, versioned schema key `necromancer_save_v1`
- No backend, fully client-side

Project layout:
```
src/
  game/             # pure logic, no React imports
    types.ts
    store.ts        # Zustand store
    tick.ts         # game loop step function
    relics.ts       # affix rolling, fusion, dust
    dungeons.ts
    upgrades.ts
    gacha.ts
    save.ts
    data/           # base definitions (relics, dungeons, upgrades)
  ui/
    screens/        # CryptMap, Reliquary, Ritual, Upgrades, Codex
    components/
    theme.ts
  App.tsx
  main.tsx
```

The `game/` folder must be testable in isolation.

## Core architecture

**Game loop.** `requestAnimationFrame` loop in a root `useEffect`, accumulating delta-time with a fixed tick of 100ms (10 ticks/sec). Each tick:
- Accrue passive resources
- Advance squad positions along routes
- Resolve combat for squads in dungeons
- Process arrivals/returns
- Tick down surge cooldown
- Auto-save every 50 ticks (5s)

Game runs at fixed 10Hz regardless of frame rate. UI updates via Zustand subscriptions.

**State shape:**
- `resources: { bones, coins, souls, dust, corpses }`
- `units: { skeletons, zombies, wraiths }` — reserve counts
- `squads: Squad[]` — active and idle
- `dungeons: DungeonState[]` — known dungeons with their cooldowns and clear counts
- `relics: { inventory: Relic[], equipped: Record<SlotId, RelicId | null> }`
- `upgrades: { purchased: string[], availablePoints: number }`
- `surge: { cooldownTicks, charges, activeBuff }`
- `gacha: { pityCounters: Record<PoolId, number>, pullHistory: PullRecord[] }`
- `meta: { tickCount, dayCount, version }`

**Persistence.** Serialize entire state to localStorage every 5s. On load: validate `version`. If mismatched, offer "Reset save?" prompt rather than silently corrupting. Serialize Sets as arrays.

## Game systems

### Resources
- **Bones** — primary. Passive trickle from summoning circles + dungeon loot.
- **Coins** — secondary. Dungeon loot only.
- **Souls** — rare. ~5% chance per dungeon clear, more from higher tiers.
- **Corpses** — derivative. Returned by squads based on enemies killed. Used to make zombies.
- **Dust** — sacrifice byproduct. 100 dust = 1 free pull on any pool.

### Units (3 types)

| Unit | HP | DMG | Speed | Cost | Unlock |
|---|---|---|---|---|---|
| Skeleton | 10 | 3 | 1.0 | 10 bones | Start |
| Zombie | 25 | 4 | 0.6 | 5 bones + 1 corpse | Upgrade |
| Wraith | 6 | 8 | 1.5 | 20 bones + 1 soul | Upgrade |

### Squads

A Squad has: id, name, composition (counts per unit type), target dungeon (or none), state (idle | traveling | fighting | returning), position (0-1 along route), HP totals per unit type.

Squad max size starts at 5 units (scales via upgrades). Max active squads: 3 → 8 (scales via upgrades).

Squad names: pool of evocative names ("Coldfingers", "Pale Choir", "Drift of Vael", "Marrow-Eight", "Husk Brigade", "Bone Tide", "Ash Cohort"…). Auto-name on creation, allow rename.

### Dungeons (5 for v1)

Each: `id, name, tier, hpPool, dps, lootTable, travelTime, position{x,y}, unlockCondition`.

1. **Pauper's Tomb** — tier 1, low yield, low danger
2. **Wolf Den** — tier 1, bones focus, moderate attrition
3. **Abandoned Chapel** — tier 1, coins focus
4. **Watcher's Spire** — tier 2, unlocked after 3 clears at tier 1
5. **Ossuary of Vael** — tier 3, unlocked after clearing Watcher's Spire

Combat per tick:
- Squad damage to dungeon: `Σ(unit.dmg × count) × modifiers × 0.1`
- Dungeon damage to squad: `dps × 0.1`, applied to weakest unit type first
- Squad retreats with no loot if reduced to 0 units
- Dungeon clear: HP pool → 0 → squad returns with loot

Post-clear: dungeon cooldown of 30s (tier 1), 60s (tier 2), 120s (tier 3). Yield scales logarithmically with clear count: `base × (1 + log(clearCount + 1) × 0.2)`.

### Relics + affix system

The heart of the game. Get this right.

```typescript
type Relic = {
  id: string;
  baseId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  mainAffix: { id: string; value: number; rollPosition: number };
  minorAffixes: Array<{ id: string; value: number; rollPosition: number }>;
  uniqueAffix?: string; // Legendary only
  upgradeLevel: number; // 0-5
  duplicateCount: number;
  quality: number; // derived: mean(rollPositions) × 100
};
```

**Rarity → slots:**

| Rarity | Main | Minor | Quality range |
|---|---|---|---|
| Common | 1 | 0 | 0–40% |
| Uncommon | 1 | 1 | 20–60% |
| Rare | 1 | 2 | 35–75% |
| Epic | 1 | 3 | 55–90% |
| Legendary | 1 | 3 + unique | 70–100% |

**Roll math:** mix-of-two-uniforms. 80% chance: roll in center band (40-60% of range). 20% chance: roll across full range. Record `rollPosition` as normalized 0-1.

**Relic bases (~12):**
- **Crypt-bound** (3 equip slots on crypt): Marrow Halo, Bone Censer, Pale Sigil, Hex Lantern
- **Skeleton circle** (2 slots): Coldring, Shard of Vael, Femur Scepter
- **Zombie circle** (2 slots): Plague Stone, Husk Eye
- **Wraith circle** (2 slots): Wraith Lens, Ghost Cinder, Soul Reed

Each base has one fixed main-affix type with a value range. Each slot type has a minor-affix pool (~10 affixes) drawn from on roll. Design these affix pools yourself; sample for Crypt slot: `+X% bone yield, +X% coin yield, +X% squad return speed, -X% summon cost, +X squad cap, +X% drop rate, +X% rarity weight, +X% surge duration`. Sample for Skeleton circle: `+X% skeleton damage, +X% skeleton speed, +X HP per skeleton, +X% chance to resurrect on death, +X% bone yield from skeleton kills`.

**Equipping:** click-to-equip flow (drag-drop optional). Equipped relics modify gameplay on next tick. Recompute effective stats on equip/unequip.

**Fusion:** 5 duplicates of same `baseId+rarity` → +1 upgrade level on kept relic (auto-keep highest quality). Each level adds 10% to all rolled values. Cap +5. Past +5, duplicates auto-sacrifice for dust.

**Sacrifice:** Common=1, Uncommon=3, Rare=10, Epic=30, Legendary=100 dust. 100 dust = 1 pity pull on any pool (player selects).

**Sets:** define 3 sets (Bonewalker / Plaguebound / Ethereal) and show progress in UI. **Do not implement set bonus effects in v1** — display only.

### Gacha (Ritual of Calling)

Three pools:

| Pool | Cost (x1) | Cost (x10) | Odds |
|---|---|---|---|
| Bone | 200 bones | 1,800 bones | C 70% / U 25% / R 5% |
| Soul | 5 souls | 45 souls | C 30% / U 40% / R 25% / E 5% |
| Forbidden | 1,500 coins | 13,500 coins | R 30% / E 50% / L 20% |

**Pity:** Soul Ritual: Rare+ guaranteed every 20 pulls. Forbidden: Legendary guaranteed every 50 pulls. Bone: no pity.

**x10 bonus:** at least one Uncommon+ (Bone), Rare+ (Soul), Epic+ (Forbidden) per ten-pull.

**Which relic base drops:** weighted random across all valid bases for the rolled rarity. Common rarity can roll any base; higher rarities can roll any base too — rarity is independent of identity.

**Reveal animation:** card flip. For x10, show all ten face-down, click to reveal individually or "Skip" to reveal all at once.

### Upgrades

Three branches, 6 nodes each. Points awarded: 1 point per dungeon clear × tier. Spent on nodes.

**Summoning:** Faster Summon, Larger Squads, Skeleton Mastery I, **Zombie Unlock**, Zombie Mastery I, **Wraith Unlock**
**Command:** Auto-Deploy (squads re-dispatch on return), Targeting AI (+10% dmg), Aggression Stance (+dmg -hp), Caution Stance (+hp -dmg), Multi-Squad +1 (×3 nodes increasing cap), Auto-Surge
**Necromancy:** Bone Surge (+passive bones), Soul Harvest (+soul drop), Plague Field (zombie AoE), Death Aura (+squad HP regen), Drop Rate +20%, Rarity Boost (+1 tier chance)

Each node: cost (points), prerequisites (other node IDs), effect (a function that mutates state on purchase, or a flag the game loop reads).

Cross-branch gating: late Summoning needs a Necromancy node; late Command needs a Summoning unit-unlock.

### Necrotic Surge

Button on Crypt Map. 90s cooldown, max 3 charges. Activate → choose one of three buffs (yield ×2, speed ×2, damage ×2) for 18s, applied to all squads. UI: radial cooldown ring + charge pips.

## Screens

### 1. Crypt Map (main)
- SVG canvas: hex crypt center, 3 summoning circle nodes attached, 5 dungeon nodes around
- Squads animate as colored dots (white skeleton / pale green zombie / translucent blue wraith) along Bezier paths
- Right sidebar: Active Legions list with name, target, progress bar, ETA
- Top bar: currencies with per-second rates, phase indicator
- Bottom-right: Necrotic Surge with cooldown and Activate flow
- Click empty dungeon → Dispatch Squad modal (compose, name, dispatch)
- Click squad in sidebar → highlight on map, option to recall

### 2. Reliquary
- Left: 9 equipped slots (3 Crypt + 2 per circle), rarity-bordered cards
- Center: selected relic detail — main affix, minors, quality bar, fusion progress (X/5), Upgrade and Sacrifice buttons
- Right: inventory grid, filterable by rarity/slot
- Bottom: Set progress (3 sets, display-only)

### 3. Ritual of Calling
- Three pool columns
- Each shows: name, flavor text, drop odds bar, pity counter ("23/50 to guaranteed Legendary"), Pull and Pull×10 buttons with cost
- Left sidebar: pull history (last 10)
- Center reveal area for animations

### 4. Upgrade Tree
- Three vertical branches with nodes connected by lines
- Owned (filled), available (highlighted), locked (faded)
- Click/hover → right panel with description, cost, prereqs, Learn button
- Cross-branch prereqs shown as faint diagonal lines
- Left panel: points available, points by branch

### 5. Soul Codex (stub)
- Placeholder screen: "Phase III — Dominion. Coming soon." Do not implement contents.

All screens share top bar (currencies + phase indicator) and bottom tab nav.

## Scope cuts (do not implement)

- Phase 2 (Necropolis) or Phase 3 (Veil)
- Soul Codex contents
- Prestige / Reincarnation
- Black Market events
- Set bonus effects (display set progress, but no gameplay effect)
- Multiple save slots
- Sound or music
- Mobile responsive layout (target 1280–1920px desktop)
- Settings menu beyond a "Reset Save" button somewhere visible

## Acceptance criteria

The prototype is done when:

1. Player can dispatch a squad, watch dots travel to a dungeon, see combat resolve, see loot deposit on return
2. Bones and coins accrue with visible per-second rates
3. Player can pull from any of the 3 pools, receive relics with rolled affixes and quality scores
4. Player can equip a relic and observe a numeric change in squad performance
5. Player can purchase an upgrade and see its effect immediately
6. Game state persists across page reload
7. Necrotic Surge usable with correct cooldown and buff effect
8. All 4 functional screens navigable with consistent dark-fantasy styling
9. Game playable for 30+ minutes without progression dead-ends or softlocks
10. No console errors during normal play

## Implementation order

1. Scaffold (Vite + React + TS + Tailwind + Zustand), theme tokens
2. Types and Zustand store with seed data
3. Game loop with tick (no UI — log to console, verify resources accrue)
4. Crypt Map static layout
5. Squad dispatch flow + dot animation
6. Combat tick + loot return
7. localStorage persistence
8. Upgrades screen + purchasing
9. Relic generation + Reliquary screen
10. Gacha screen with rolls
11. Equipped-relic effects on combat
12. Necrotic Surge
13. Polish pass (animations, tooltips, transitions)

The game should be playable as early as step 7. Stop and test after each step.

## Open decisions (make as you go)

- Exact affix value ranges per base (start conservative, tune by feel)
- Dot animation easing and dot spacing along paths
- Squad-composition modal control style (drag vs ± buttons — pick one)
- Tooltip layout and trigger (hover vs click)
- How dungeon clear and squad return events visually punctuate

When you complete a milestone, summarize what's working and what you deferred so the user can run it and give feedback before the next step.
