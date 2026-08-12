import type { AffixEffect, Rarity, RelicBase } from "../types";

/** Rarity from worst to best. Everything that ranks rarities derives from this. */
export const RARITY_ORDER = [
	"common",
	"uncommon",
	"rare",
	"epic",
	"legendary",
] as const;

/** How many minor affixes a relic of each rarity rolls. */
export const MINOR_COUNT: Record<Rarity, number> = {
	common: 0,
	uncommon: 1,
	rare: 2,
	epic: 3,
	legendary: 3,
};

/**
 * Added to every affix's roll position, so a rarer relic rolls higher within
 * the same range. A boost can push the position past 1, which is deliberate:
 * a legendary may roll above its affix's nominal maximum.
 */
export const POS_BOOST_RARITY: Record<Rarity, number> = {
	common: 0.0,
	uncommon: 0.1,
	rare: 0.2,
	epic: 0.35,
	legendary: 0.5,
};

/** Dust paid for sacrificing a relic of each rarity. */
export const DUST_VALUES: Record<Rarity, number> = {
	common: 1,
	uncommon: 2,
	rare: 5,
	epic: 10,
	legendary: 30,
};

/**
 * Affix multiplier per relic upgrade level: `1 + level × step`. Read by both
 * the display formatter and `recomputeDerived`, so a card can't promise a
 * number combat doesn't use. Inert today; nothing writes `upgradeLevel`.
 */
export const RELIC_UPGRADE_STEP = 0.1;

export const RELIC_BASES: RelicBase[] = [
	// ═══════════════════════════════════════════════════════════════
	// CRYPT-BOUND (C1, C2, C3) — Global / economy / meta affixes
	// ═══════════════════════════════════════════════════════════════
	{
		id: "marrow-halo",
		name: "Marrow Halo",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "boneYield",
		mainAffixRange: [15, 30],
		minorAffixPool: ["boneYield", "corpseYield", "rarityWeight", "soulOnKill"],
		glyph: "ring",
		description:
			"A halo of calcified marrow. Amplifies the passive bone trickle.",
	},
	{
		id: "bone-censer",
		name: "Bone Censer",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "soulOnKill",
		mainAffixRange: [10, 25],
		minorAffixPool: ["soulOnKill", "boneYield", "corpseYield", "rarityWeight"],
		glyph: "flame",
		description:
			"Burning bones raise a smoke the departing cannot cross. They linger, and are taken.",
	},
	{
		id: "pale-sigil",
		name: "Pale Sigil",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "squadTravelSpeed",
		mainAffixRange: [10, 25],
		minorAffixPool: ["squadTravelSpeed", "dispatchBonus", "firstStrikeBonus"],
		glyph: "star",
		description: "An ivory seal that beckons squads onward.",
	},
	{
		id: "hex-lantern",
		name: "Hex Lantern",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "boneYield",
		mainAffixRange: [15, 35],
		minorAffixPool: ["boneYield", "rarityWeight", "corpseYield", "soulOnKill"],
		glyph: "hex",
		description: "A hexagonal lantern that illuminates hidden loot.",
	},
	{
		id: "hollow-crown",
		name: "Hollow Crown",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "squadSizeBonus",
		mainAffixRange: [7, 30],
		minorAffixPool: [
			"squadSizeBonus",
			"corpseYield",
			"boneYield",
			"dispatchBonus",
		],
		glyph: "crown",
		description: "A crown of empty sockets. The wearer commands more dead.",
	},
	{
		id: "reliquarium",
		name: "Reliquarium",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "rarityWeight",
		mainAffixRange: [3, 12],
		minorAffixPool: ["rarityWeight", "corpseYield", "boneYield", "soulOnKill"],
		glyph: "urn",
		description: "A vessel that preserves what should be rare.",
	},
	{
		id: "wax-effigy",
		name: "Wax Effigy",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "squadTravelSpeed",
		mainAffixRange: [10, 25],
		minorAffixPool: [
			"squadTravelSpeed",
			"dispatchBonus",
			"firstStrikeBonus",
			"boneYield",
		],
		glyph: "figure",
		description:
			"A poured-wax figure of you. While it burns, your will reaches further.",
	},
	{
		id: "carrion-banner",
		name: "Carrion Banner",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "corpseYield",
		mainAffixRange: [10, 20],
		minorAffixPool: [
			"corpseYield",
			"squadTravelSpeed",
			"boneYield",
			"rarityWeight",
		],
		glyph: "banner",
		description:
			"Raised over a field of the dead, it draws more from the harvest.",
	},

	// ═══════════════════════════════════════════════════════════════
	// SKELETON CIRCLE (I1, I2) — Cheap mass, kill volume
	// ═══════════════════════════════════════════════════════════════
	{
		id: "coldring",
		name: "Coldring",
		slot: "skeleton",
		slotIds: ["I1", "I2"],
		mainAffixId: "skeletonDamage",
		mainAffixRange: [10, 25],
		minorAffixPool: [
			"skeletonDamage",
			"skeletonSpeed",
			"skeletonHp",
			"boneYieldFromKills",
			"overwhelm",
		],
		glyph: "ring",
		description: "A ring of cold iron that sharpens skeletal strikes.",
	},
	{
		id: "shard-of-vael",
		name: "Shard of Vael",
		slot: "skeleton",
		slotIds: ["I1", "I2"],
		mainAffixId: "skeletonSpeed",
		mainAffixRange: [15, 30],
		minorAffixPool: [
			"skeletonSpeed",
			"skeletonDamage",
			"skeletonHp",
			"firstStrikeBonus",
			"overwhelm",
		],
		glyph: "spike",
		description:
			"A fragment of Vael's first crypt-stone. Skeletons move with purpose.",
	},
	{
		id: "femur-scepter",
		name: "Femur Scepter",
		slot: "skeleton",
		slotIds: ["I1", "I2"],
		mainAffixId: "skeletonHp",
		mainAffixRange: [15, 30],
		minorAffixPool: [
			"skeletonHp",
			"skeletonDamage",
			"skeletonSpeed",
			"boneYieldFromKills",
			"lastStand",
		],
		glyph: "blade",
		description:
			"A scepter carved from a mighty femur. Skeletons endure more punishment.",
	},
	{
		id: "rib-cuirass",
		name: "Rib Cuirass",
		slot: "skeleton",
		slotIds: ["I1", "I2"],
		mainAffixId: "lastStand",
		mainAffixRange: [25, 60],
		minorAffixPool: [
			"lastStand",
			"skeletonHp",
			"skeletonDamage",
			"overwhelm",
			"firstStrikeBonus",
		],
		glyph: "shield",
		description: "Bound rib bones form armor that does not bleed.",
	},
	{
		id: "tomb-tooth",
		name: "Tomb Tooth",
		slot: "skeleton",
		slotIds: ["I1", "I2"],
		mainAffixId: "overwhelm",
		mainAffixRange: [5, 20],
		minorAffixPool: [
			"overwhelm",
			"skeletonDamage",
			"skeletonSpeed",
			"boneYieldFromKills",
			"firstStrikeBonus",
		],
		glyph: "tooth",
		description:
			"A single fang torn from a forgotten king. The swarm follows its bite.",
	},

	// ═══════════════════════════════════════════════════════════════
	// ZOMBIE CIRCLE (II1, II2) — Wall, tank, attrition
	// ═══════════════════════════════════════════════════════════════
	{
		id: "plague-stone",
		name: "Plague Stone",
		slot: "zombie",
		slotIds: ["II1", "II2"],
		mainAffixId: "zombieDamage",
		mainAffixRange: [10, 25],
		minorAffixPool: [
			"zombieDamage",
			"zombieHp",
			"corpseYield",
			"undyingFlesh",
			"berserk",
		],
		glyph: "cross",
		description:
			"A stone seething with necrotic infection. Zombies hit harder.",
	},
	{
		id: "husk-eye",
		name: "Husk Eye",
		slot: "zombie",
		slotIds: ["II1", "II2"],
		mainAffixId: "zombieHp",
		mainAffixRange: [15, 35],
		minorAffixPool: [
			"zombieHp",
			"zombieDamage",
			"undyingFlesh",
			"berserk",
			"lastStand",
		],
		glyph: "eye",
		description:
			"The preserved eye of a long-dead plague-bearer. Zombies shamble on longer.",
	},
	{
		id: "rot-censer",
		name: "Rot Censer",
		slot: "zombie",
		slotIds: ["II1", "II2"],
		mainAffixId: "undyingFlesh",
		mainAffixRange: [3, 10],
		minorAffixPool: [
			"undyingFlesh",
			"zombieHp",
			"zombieDamage",
			"berserk",
			"lastStand",
		],
		glyph: "flame",
		description: "It burns nothing, but the dead inhale and refuse to die.",
	},
	{
		id: "gravetongue",
		name: "Gravetongue",
		slot: "zombie",
		slotIds: ["II1", "II2"],
		mainAffixId: "berserk",
		mainAffixRange: [10, 30],
		minorAffixPool: [
			"berserk",
			"zombieDamage",
			"zombieHp",
			"undyingFlesh",
			"lastStand",
		],
		glyph: "tongue",
		description:
			"A bell-clapper of dried flesh. Wounds it, and it answers louder.",
	},

	// ═══════════════════════════════════════════════════════════════
	// WRAITH CIRCLE (III1, III2) — Assassination, fragility, soul-bound
	// ═══════════════════════════════════════════════════════════════
	{
		id: "wraith-lens",
		name: "Wraith Lens",
		slot: "wraith",
		slotIds: ["III1", "III2"],
		mainAffixId: "wraithDamage",
		mainAffixRange: [15, 35],
		minorAffixPool: [
			"wraithDamage",
			"wraithSpeed",
			"wraithHp",
			"soulOnKill",
			"spectralStrike",
		],
		glyph: "eye",
		description: "A lens that focuses spectral energy into lethal beams.",
	},
	{
		id: "ghost-cinder",
		name: "Ghost Cinder",
		slot: "wraith",
		slotIds: ["III1", "III2"],
		mainAffixId: "wraithSpeed",
		mainAffixRange: [15, 30],
		minorAffixPool: [
			"wraithSpeed",
			"wraithDamage",
			"wraithHp",
			"soulOnKill",
			"spectralStrike",
		],
		glyph: "drop",
		description:
			"Ash from a ghost-fire that never burned out. Wraiths blur across the field.",
	},
	{
		id: "soul-reed",
		name: "Soul Reed",
		slot: "wraith",
		slotIds: ["III1", "III2"],
		mainAffixId: "soulOnKill",
		mainAffixRange: [20, 40],
		minorAffixPool: [
			"soulOnKill",
			"wraithDamage",
			"wraithSpeed",
			"spectralStrike",
			"wraithHp",
		],
		glyph: "blade",
		description:
			"A hollow reed that vibrates at the frequency of departing souls.",
	},
	{
		id: "veil-shard",
		name: "Veil Shard",
		slot: "wraith",
		slotIds: ["III1", "III2"],
		mainAffixId: "spectralStrike",
		mainAffixRange: [5, 15],
		minorAffixPool: [
			"spectralStrike",
			"wraithDamage",
			"soulOnKill",
			"wraithSpeed",
			"wraithHp",
		],
		glyph: "shard",
		description:
			"A fragment of the veil between worlds. Wraiths strike through it.",
	},
	{
		id: "mourners-veil",
		name: "Mourner's Veil",
		slot: "wraith",
		slotIds: ["III1", "III2"],
		mainAffixId: "wraithHp",
		mainAffixRange: [10, 25],
		minorAffixPool: [
			"wraithHp",
			"wraithSpeed",
			"wraithDamage",
			"soulOnKill",
			"spectralStrike",
		],
		glyph: "veil",
		description:
			"A widow's cloth, soaked in grief. It softens the blows aimed at the dead.",
	},
];

export const AFFIX_DEFS: Record<
	string,
	{
		label: string;
		unit: string;
		range: [number, number];
		/**
		 * Where the rolled value lands. `elsewhere` marks an affix that rolls
		 * onto relics but has no effect yet.
		 */
		effect: AffixEffect;
		description?: string;
	}
> = {
	// ── Economy (Crypt slot) ───────────────────────────────────────
	boneYield: {
		label: "Bone Yield",
		unit: "%",
		range: [5, 35],
		effect: { kind: "global", stat: "boneYieldBonus", op: "add" },
		description: "Increases bone income from all sources.",
	},
	/**
	 * Retired along with coins. No base rolls it, but the def stays so relics
	 * already in a save render a label and a value — `applyAffix` still honours
	 * it, on a resource nothing spends.
	 */
	coinYield: {
		label: "Coin Yield",
		unit: "%",
		range: [5, 30],
		effect: { kind: "global", stat: "coinYieldBonus", op: "add" },
		description: "Retired — coins are no longer spent on anything.",
	},
	corpseYield: {
		label: "Corpse Yield",
		unit: "%",
		range: [5, 20],
		effect: { kind: "global", stat: "corpseYieldBonus", op: "add" },
		description: "Increases corpse drops from all sources.",
	},
	rarityWeight: {
		label: "Rarity Weight",
		unit: "%",
		range: [3, 15],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Shifts Ritual odds toward higher rarities.",
		},
		description: "Shifts gacha odds toward higher rarities.",
	},

	// ── Squad / dispatch (Crypt slot) ──────────────────────────────
	squadTravelSpeed: {
		label: "Squad Travel Speed",
		unit: "%",
		range: [5, 25],
		effect: { kind: "global", stat: "squadTravelSpeedBonus", op: "add" },
		description: "Squads move faster to and from dungeons.",
	},
	squadSizeBonus: {
		label: "Squad Size",
		unit: "%",
		range: [5, 25],
		effect: { kind: "global", stat: "maxSquadSize", op: "pctOfSelf" },
		description: "Increases max squad size while equipped.",
	},
	dispatchBonus: {
		label: "Dispatch Bonus",
		unit: "%",
		range: [10, 25],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Bonus on dispatch.",
		},
		description: "First 10s after squad arrival: bonus damage.",
	},

	// ── Skeleton (Skeleton slot) ───────────────────────────────────
	skeletonDamage: {
		label: "Skeleton Damage",
		unit: "%",
		range: [5, 30],
		effect: { kind: "unit", units: ["skeleton"], stat: "dmgBonus" },
		description: "Increases skeleton damage.",
	},
	skeletonSpeed: {
		label: "Skeleton Speed",
		unit: "%",
		range: [5, 25],
		effect: { kind: "unit", units: ["skeleton"], stat: "speedBonus" },
		description: "Skeletons move faster.",
	},
	skeletonHp: {
		label: "Skeleton HP",
		unit: "%",
		range: [5, 30],
		effect: { kind: "unit", units: ["skeleton"], stat: "hpBonus" },
		description: "Increases skeleton HP.",
	},
	boneYieldFromKills: {
		label: "Bones from Kills",
		unit: "%",
		range: [3, 15],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Grants bones per enemy killed.",
		},
		description:
			"Each enemy killed drops bonus bones. REWORK from current passive boost.",
	},
	overwhelm: {
		label: "Overwhelm",
		unit: "%",
		range: [5, 20],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Bonus damage while outnumbering the enemy.",
		},
		description: "Damage scales when squad outnumbers enemies in radius.",
	},
	firstStrikeBonus: {
		label: "First Strike",
		unit: "%",
		range: [10, 30],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Bonus damage on the opening exchange.",
		},
		description: "Bonus damage in the first 5s of a battle.",
	},

	// ── Zombie (Zombie slot) ───────────────────────────────────────
	zombieDamage: {
		label: "Zombie Damage",
		unit: "%",
		range: [5, 25],
		effect: { kind: "unit", units: ["zombie"], stat: "dmgBonus" },
		description: "Increases zombie damage.",
	},
	zombieHp: {
		label: "Zombie HP",
		unit: "%",
		range: [5, 35],
		effect: { kind: "unit", units: ["zombie"], stat: "hpBonus" },
		description: "Increases zombie HP.",
	},
	undyingFlesh: {
		label: "Undying Flesh",
		unit: "%",
		range: [1, 4],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Zombies survive a killing blow.",
		},
		description: "Zombies regenerate HP per second in combat.",
	},
	berserk: {
		label: "Berserk",
		unit: "%",
		range: [10, 30],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Damage rises as HP falls.",
		},
		description: "Damage scales with HP missing.",
	},
	lastStand: {
		label: "Last Stand",
		unit: "%",
		range: [25, 60],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Bonus stats for the final surviving unit.",
		},
		description: "Massive bonus when squad drops below 20% units.",
	},

	// ── Wraith (Wraith slot) ───────────────────────────────────────
	wraithDamage: {
		label: "Wraith Damage",
		unit: "%",
		range: [5, 35],
		effect: { kind: "unit", units: ["wraith"], stat: "dmgBonus" },
		description: "Increases wraith damage.",
	},
	wraithSpeed: {
		label: "Wraith Speed",
		unit: "%",
		range: [5, 30],
		effect: { kind: "unit", units: ["wraith"], stat: "speedBonus" },
		description: "Wraiths move faster.",
	},
	wraithHp: {
		label: "Wraith HP",
		unit: "%",
		range: [5, 25],
		effect: { kind: "unit", units: ["wraith"], stat: "hpBonus" },
		description: "Increases wraith HP.",
	},
	soulOnKill: {
		label: "Soul on Kill",
		unit: "%",
		range: [5, 40],
		effect: { kind: "global", stat: "soulHarvestBonus", op: "add", scale: 2 },
		description: "Chance to gain a soul per enemy killed.",
	},
	spectralStrike: {
		label: "Spectral Strike",
		unit: "%",
		range: [3, 10],
		effect: {
			kind: "elsewhere",
			where: "unimplemented",
			note: "Wraith damage scales with target HP.",
		},
		description: "Wraith damage scales with target HP%.",
	},
};
