import type { AffixEffect, Rarity, RelicBase, SlotId } from "../types";

/**
 * Slots open before any upgrade is bought — one crypt slot and the first slot
 * of each summoning circle. Every other slot is unlocked by a node in the
 * necromancy branch. A circle's slots stay hidden until its unit is unlocked,
 * so opening `II1` costs nothing while zombies are still buried.
 */
export const BASE_UNLOCKED_SLOTS: readonly SlotId[] = [
	"C1",
	"I1",
	"II1",
	"III1",
];

/** Short name for a slot, as the Reliquary and the upgrade tree both print it. */
export const SLOT_LABELS: Record<SlotId, string> = {
	C1: "C-I",
	C2: "C-II",
	C3: "C-III",
	I1: "S-I",
	I2: "S-II",
	II1: "Z-I",
	II2: "Z-II",
	III1: "W-I",
	III2: "W-II",
};

/** Rarity from worst to best. Everything that ranks rarities derives from this. */
export const RARITY_ORDER = [
	"common",
	"uncommon",
	"rare",
	"epic",
	"legendary",
] as const;

/**
 * Minor affixes a relic of each rarity rolls on top of its main affix. A base's
 * signature displaces a minor rather than adding a row, so three affixes is the
 * ceiling at every rarity. A drawn minor matching the base's main affix folds
 * into it, so a relic can show fewer rows and hit harder on one stat.
 */
export const MINOR_COUNT: Record<Rarity, number> = {
	common: 0,
	uncommon: 1,
	rare: 1,
	epic: 2,
	legendary: 2,
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
		minorAffixPool: ["boneYield", "corpseYield", "summonRites", "tombRobber"],
		glyph: "ring",
		description:
			"A halo of calcified marrow. Amplifies the passive bone trickle.",
	},
	{
		id: "bone-censer",
		name: "Bone Censer",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "soulHarvest",
		mainAffixRange: [10, 25],
		minorAffixPool: ["soulHarvest", "soulYield", "boneYield", "corpseYield"],
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
		minorAffixPool: ["squadTravelSpeed", "warHorn", "reapersDue"],
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
		minorAffixPool: ["boneYield", "tombRobber", "corpseYield", "enemyFrailty"],
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
			"gravebound",
		],
		signatureAffixId: "dreadCommand",
		glyph: "crown",
		description: "A crown of empty sockets. The wearer commands more dead.",
	},
	{
		id: "reliquarium",
		name: "Reliquarium",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "tombRobber",
		mainAffixRange: [15, 45],
		minorAffixPool: ["tombRobber", "reapersDue", "boneYield", "soulYield"],
		glyph: "urn",
		description:
			"A vessel that remembers every tomb you have already emptied, and where you missed.",
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
			"warHorn",
			"recklessRites",
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
			"reapersDue",
			"enemyPalsy",
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
			"overwhelm",
			"brittleEdge",
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
			"firstStrike",
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
			"lastStand",
			"brittleEdge",
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
			"firstStrike",
		],
		signatureAffixId: "lichBond",
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
			"firstStrike",
			"brittleEdge",
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
			"berserk",
			"rotbound",
			"undyingFlesh",
		],
		signatureAffixId: "bloodfeast",
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
		signatureAffixId: "deathAura",
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
			"rotbound",
			"undyingFlesh",
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
			"executioner",
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
			"spectralStrike",
			"executioner",
		],
		signatureAffixId: "vanguardDrums",
		glyph: "drop",
		description:
			"Ash from a ghost-fire that never burned out. Wraiths blur across the field.",
	},
	{
		id: "soul-reed",
		name: "Soul Reed",
		slot: "wraith",
		slotIds: ["III1", "III2"],
		mainAffixId: "soulHarvest",
		mainAffixRange: [20, 40],
		minorAffixPool: [
			"soulHarvest",
			"soulYield",
			"wraithDamage",
			"wraithSpeed",
			"spectralStrike",
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
		mainAffixRange: [10, 25],
		minorAffixPool: [
			"spectralStrike",
			"wraithDamage",
			"executioner",
			"wraithSpeed",
			"hollowVessel",
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
			"executioner",
			"hollowVessel",
		],
		signatureAffixId: "secondDeath",
		glyph: "veil",
		description:
			"A widow's cloth, soaked in grief. It softens the blows aimed at the dead.",
	},
];

export interface AffixDefinition {
	label: string;
	/** `%` or `''` for a flat count. */
	unit: string;
	range: [number, number];
	/**
	 * Where the rolled value lands. More than one entry makes a trade-off affix:
	 * every effect reads the same roll, and a negative `scale` turns part of it
	 * into a cost.
	 */
	effects: AffixEffect[];
	/**
	 * Locks the affix to relics of this rarity or better. A gated affix is never
	 * drawn into a minor slot — the only way to one is a base that names it as
	 * its `signatureAffixId`.
	 */
	minRarity?: Rarity;
	description?: string;
}

export const AFFIX_DEFS: Record<string, AffixDefinition> = {
	// ── Economy (Crypt slot) ───────────────────────────────────────
	boneYield: {
		label: "Bone Yield",
		unit: "%",
		range: [5, 35],
		effects: [{ kind: "global", stat: "boneYieldBonus", op: "add" }],
		description: "Increases bone income from all sources.",
	},
	corpseYield: {
		label: "Corpse Yield",
		unit: "%",
		range: [5, 20],
		effects: [{ kind: "global", stat: "corpseYieldBonus", op: "add" }],
		description: "Increases corpse drops from all sources.",
	},
	soulYield: {
		label: "Soul Yield",
		unit: "%",
		range: [10, 45],
		effects: [{ kind: "global", stat: "soulsYieldBonus", op: "add" }],
		description: "Increases the souls banked each time a clear drops them.",
	},
	soulHarvest: {
		label: "Soul Harvest",
		unit: "%",
		range: [5, 40],
		effects: [
			{ kind: "global", stat: "soulHarvestBonus", op: "add", scale: 2 },
		],
		description: "Increases the chance a clear drops souls at all.",
	},
	tombRobber: {
		label: "Tomb Robber",
		unit: "%",
		range: [10, 40],
		effects: [{ kind: "global", stat: "clearMultBonus", op: "add" }],
		description:
			"Steepens the repeat-clear payout curve — worth most on a dungeon you have farmed.",
	},
	reapersDue: {
		label: "Reaper's Due",
		unit: "%",
		range: [3, 12],
		effects: [{ kind: "global", stat: "bannerChanceBonus", op: "add" }],
		description: "Chance a clear pays one banner beyond the dungeon's tier.",
	},
	summonRites: {
		label: "Summon Rites",
		unit: "%",
		range: [3, 12],
		effects: [{ kind: "global", stat: "summonCostBonus", op: "add" }],
		description: "Skeletons cost less bone to raise.",
	},

	// ── Squad / dispatch (Crypt slot) ──────────────────────────────
	squadTravelSpeed: {
		label: "Squad Travel Speed",
		unit: "%",
		range: [5, 25],
		effects: [{ kind: "global", stat: "squadTravelSpeedBonus", op: "add" }],
		description: "Squads move faster to and from dungeons.",
	},
	squadSizeBonus: {
		label: "Squad Size",
		unit: "%",
		range: [5, 25],
		effects: [{ kind: "global", stat: "maxSquadSize", op: "pctOfSelf" }],
		description: "Increases max squad size while equipped.",
	},

	// ── Enemy debuffs (Crypt slot) ─────────────────────────────────
	enemyFrailty: {
		label: "Frailty",
		unit: "%",
		range: [3, 12],
		effects: [{ kind: "global", stat: "enemyHpPenalty", op: "add" }],
		description: "Dungeon defenders muster with less HP.",
	},
	enemyPalsy: {
		label: "Palsy",
		unit: "%",
		range: [3, 12],
		effects: [{ kind: "global", stat: "enemyDmgPenalty", op: "add" }],
		description: "Dungeon defenders strike for less.",
	},

	// ── Trade-offs — one roll, paid for out of another stat ────────
	// A fight's outcome tracks damage × HP, so trading one for the other evenly
	// is power-neutral however large the roll. These roll several times a pure
	// affix's ceiling against a shallow scale instead, making one a clear gain;
	// the cost lands where the product doesn't show, as a squad that still wins
	// but bleeds units doing it — which is what pushes a dungeon back out of
	// reach of running unattended.
	recklessRites: {
		label: "Reckless Rites",
		unit: "%",
		range: [30, 70],
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "dmgBonus",
			},
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "hpBonus",
				scale: -0.3,
			},
		],
		description: "Every unit hits harder and breaks sooner.",
	},
	gravebound: {
		label: "Gravebound",
		unit: "%",
		range: [30, 80],
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "hpBonus",
			},
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "speedBonus",
				scale: -0.35,
			},
		],
		description: "The grave holds your dead together, and holds them back.",
	},
	brittleEdge: {
		label: "Brittle Edge",
		unit: "%",
		range: [40, 90],
		effects: [
			{ kind: "unit", units: ["skeleton"], stat: "dmgBonus" },
			{ kind: "unit", units: ["skeleton"], stat: "hpBonus", scale: -0.3 },
		],
		description: "Bone honed to an edge that cuts once and splinters.",
	},
	rotbound: {
		label: "Rotbound",
		unit: "%",
		range: [50, 110],
		effects: [
			{ kind: "unit", units: ["zombie"], stat: "hpBonus" },
			{ kind: "unit", units: ["zombie"], stat: "dmgBonus", scale: -0.3 },
		],
		description:
			"Bloated past all reason. Nothing gets through, and nothing hurries.",
	},
	hollowVessel: {
		label: "Hollow Vessel",
		unit: "%",
		range: [40, 90],
		effects: [
			{ kind: "unit", units: ["wraith"], stat: "dmgBonus" },
			{ kind: "unit", units: ["wraith"], stat: "speedBonus", scale: -0.4 },
		],
		description: "A wraith poured into one place strikes harder, and drifts.",
	},

	// ── Skeleton (Skeleton slot) ───────────────────────────────────
	skeletonDamage: {
		label: "Skeleton Damage",
		unit: "%",
		range: [5, 30],
		effects: [{ kind: "unit", units: ["skeleton"], stat: "dmgBonus" }],
		description: "Increases skeleton damage.",
	},
	skeletonSpeed: {
		label: "Skeleton Speed",
		unit: "%",
		range: [5, 25],
		effects: [{ kind: "unit", units: ["skeleton"], stat: "speedBonus" }],
		description: "Skeletons move faster.",
	},
	skeletonHp: {
		label: "Skeleton HP",
		unit: "%",
		range: [5, 30],
		effects: [{ kind: "unit", units: ["skeleton"], stat: "hpBonus" }],
		description: "Increases skeleton HP.",
	},
	overwhelm: {
		label: "Overwhelm",
		unit: "%",
		range: [5, 20],
		effects: [{ kind: "unit", units: ["skeleton"], stat: "overwhelm" }],
		description:
			"Skeletons hit harder the further they outnumber the enemies around them.",
	},
	firstStrike: {
		label: "First Strike",
		unit: "%",
		range: [10, 30],
		effects: [{ kind: "unit", units: ["skeleton"], stat: "vanguard" }],
		description: "Skeletons deal bonus damage in the opening of a battle.",
	},
	lastStand: {
		label: "Last Stand",
		unit: "%",
		range: [25, 60],
		effects: [
			{ kind: "unit", units: ["skeleton", "zombie"], stat: "lastStand" },
		],
		description:
			"Bonus damage once your side is reduced to a fraction of what marched in.",
	},

	// ── Zombie (Zombie slot) ───────────────────────────────────────
	zombieDamage: {
		label: "Zombie Damage",
		unit: "%",
		range: [5, 25],
		effects: [{ kind: "unit", units: ["zombie"], stat: "dmgBonus" }],
		description: "Increases zombie damage.",
	},
	zombieHp: {
		label: "Zombie HP",
		unit: "%",
		range: [5, 35],
		effects: [{ kind: "unit", units: ["zombie"], stat: "hpBonus" }],
		description: "Increases zombie HP.",
	},
	undyingFlesh: {
		label: "Undying Flesh",
		unit: "%",
		range: [1, 4],
		effects: [{ kind: "unit", units: ["zombie"], stat: "regen" }],
		description:
			"Zombies regenerate a share of their HP every second of combat.",
	},
	berserk: {
		label: "Berserk",
		unit: "%",
		range: [10, 30],
		effects: [{ kind: "unit", units: ["zombie"], stat: "berserk" }],
		description: "Zombie damage rises as their own HP falls.",
	},

	// ── Wraith (Wraith slot) ───────────────────────────────────────
	wraithDamage: {
		label: "Wraith Damage",
		unit: "%",
		range: [5, 35],
		effects: [{ kind: "unit", units: ["wraith"], stat: "dmgBonus" }],
		description: "Increases wraith damage.",
	},
	wraithSpeed: {
		label: "Wraith Speed",
		unit: "%",
		range: [5, 30],
		effects: [{ kind: "unit", units: ["wraith"], stat: "speedBonus" }],
		description: "Wraiths move faster.",
	},
	wraithHp: {
		label: "Wraith HP",
		unit: "%",
		range: [5, 25],
		effects: [{ kind: "unit", units: ["wraith"], stat: "hpBonus" }],
		description: "Increases wraith HP.",
	},
	spectralStrike: {
		label: "Spectral Strike",
		unit: "%",
		range: [10, 25],
		effects: [{ kind: "unit", units: ["wraith"], stat: "spectral" }],
		description: "Wraiths tear hardest into targets still at full health.",
	},
	executioner: {
		label: "Executioner",
		unit: "%",
		range: [10, 30],
		effects: [{ kind: "unit", units: ["wraith"], stat: "executioner" }],
		description: "Wraiths finish wounded targets far faster.",
	},

	// ── Signatures — gated, and reachable only through a base ──────
	warHorn: {
		label: "War Horn",
		unit: "%",
		range: [8, 20],
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "vanguard",
			},
		],
		description: "Every unit opens a battle swinging harder.",
	},
	vanguardDrums: {
		label: "Vanguard Drums",
		unit: "%",
		range: [20, 45],
		minRarity: "epic",
		effects: [{ kind: "unit", units: ["wraith"], stat: "vanguard" }],
		description:
			"Wraiths reach the enemy first, and the opening exchange is theirs.",
	},
	deathAura: {
		label: "Death Aura",
		unit: "%",
		range: [5, 12],
		minRarity: "epic",
		effects: [{ kind: "unit", units: ["zombie"], stat: "aura" }],
		description:
			"Rot bleeds off your zombies into every enemy standing near them.",
	},
	bloodfeast: {
		label: "Bloodfeast",
		unit: "%",
		range: [2, 5],
		minRarity: "legendary",
		effects: [{ kind: "unit", units: ["zombie"], stat: "lifesteal" }],
		description:
			"A zombie that lands a blow eats part of it. Nothing is returned for a swing that misses.",
	},
	lichBond: {
		label: "Lich Bond",
		unit: "%",
		range: [25, 35],
		minRarity: "legendary",
		effects: [{ kind: "unit", units: ["skeleton"], stat: "revive" }],
		description:
			"The first time a skeleton falls in a battle, it gets back up at this much HP.",
	},
	secondDeath: {
		label: "Second Death",
		unit: "%",
		range: [60, 100],
		minRarity: "legendary",
		effects: [{ kind: "unit", units: ["wraith"], stat: "revive" }],
		// Rolls far higher than `lichBond` because it is worth less per point:
		// wraiths already reform between battles, so all of its value is staying
		// on the field long enough to screen.
		description:
			"The first time a wraith is unmade in a battle, it gathers again at this much HP.",
	},
	dreadCommand: {
		label: "Dread Command",
		unit: "",
		range: [1, 1],
		minRarity: "legendary",
		// A flat count rather than a percentage, so `scale` undoes the conversion
		// to a decimal that every other affix wants.
		effects: [{ kind: "global", stat: "maxSquads", op: "add", scale: 100 }],
		description: "One more warband may take the field.",
	},
};
