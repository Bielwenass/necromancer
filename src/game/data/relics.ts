import type { RelicBase } from "../types";

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
		minorAffixPool: ["boneYield", "coinYield", "corpseYield", "rarityWeight"],
		glyph: "ring",
		description:
			"A halo of calcified marrow. Amplifies the passive bone trickle.",
	},
	{
		id: "bone-censer",
		name: "Bone Censer",
		slot: "crypt",
		slotIds: ["C1", "C2", "C3"],
		mainAffixId: "coinYield",
		mainAffixRange: [10, 25],
		minorAffixPool: ["coinYield", "boneYield", "corpseYield", "rarityWeight"],
		glyph: "flame",
		description: "Burning bones transmutes grief into gold.",
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
		minorAffixPool: [
			"boneYield",
			"rarityWeight",
			"corpseYield",
			"soulOnKill",
			"coinYield",
		],
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
			"coinYield",
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
		minorAffixPool: ["rarityWeight", "coinYield", "corpseYield", "boneYield"],
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
			"coinYield",
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
		implemented?: boolean;
		description?: string;
	}
> = {
	// ── Economy (Crypt slot) ───────────────────────────────────────
	boneYield: {
		label: "Bone Yield",
		unit: "%",
		range: [5, 35],
		implemented: true,
		description: "Increases bone income from all sources.",
	},
	coinYield: {
		label: "Coin Yield",
		unit: "%",
		range: [5, 30],
		implemented: true,
		description: "Increases coin loot from dungeon clears.",
	},
	corpseYield: {
		label: "Corpse Yield",
		unit: "%",
		range: [5, 20],
		implemented: true,
		description: "Increases corpse drops from all sources.",
	},
	rarityWeight: {
		label: "Rarity Weight",
		unit: "%",
		range: [3, 15],
		implemented: false,
		description:
			"Shifts gacha odds toward higher rarities. IMPLEMENT in gacha rolling.",
	},

	// ── Squad / dispatch (Crypt slot) ──────────────────────────────
	squadTravelSpeed: {
		label: "Squad Travel Speed",
		unit: "%",
		range: [5, 25],
		implemented: true,
		description: "Squads move faster to and from dungeons.",
	},
	squadSizeBonus: {
		label: "Squad Size",
		unit: "%",
		range: [5, 25],
		implemented: true,
		description: "Increases max squad size while equipped.",
	},
	dispatchBonus: {
		label: "Dispatch Bonus",
		unit: "%",
		range: [10, 25],
		implemented: false,
		description:
			"First 10s after squad arrival: bonus damage. IMPLEMENT in combat state.",
	},

	// ── Skeleton (Skeleton slot) ───────────────────────────────────
	skeletonDamage: {
		label: "Skeleton Damage",
		unit: "%",
		range: [5, 30],
		implemented: true,
		description: "Increases skeleton damage.",
	},
	skeletonSpeed: {
		label: "Skeleton Speed",
		unit: "%",
		range: [5, 25],
		implemented: true,
		description: "Skeletons move faster.",
	},
	skeletonHp: {
		label: "Skeleton HP",
		unit: "%",
		range: [5, 30],
		implemented: true,
		description: "Increases skeleton HP.",
	},
	boneYieldFromKills: {
		label: "Bones from Kills",
		unit: "%",
		range: [3, 15],
		implemented: false,
		description:
			"Each enemy killed drops bonus bones. REWORK from current passive boost.",
	},
	overwhelm: {
		label: "Overwhelm",
		unit: "%",
		range: [5, 20],
		implemented: false,
		description:
			"Damage scales when squad outnumbers enemies in radius. IMPLEMENT in combat.",
	},
	firstStrikeBonus: {
		label: "First Strike",
		unit: "%",
		range: [10, 30],
		implemented: false,
		description:
			"Bonus damage in the first 5s of a battle. IMPLEMENT in combat init.",
	},

	// ── Zombie (Zombie slot) ───────────────────────────────────────
	zombieDamage: {
		label: "Zombie Damage",
		unit: "%",
		range: [5, 25],
		implemented: true,
		description: "Increases zombie damage.",
	},
	zombieHp: {
		label: "Zombie HP",
		unit: "%",
		range: [5, 35],
		implemented: true,
		description: "Increases zombie HP.",
	},
	undyingFlesh: {
		label: "Undying Flesh",
		unit: "%",
		range: [1, 4],
		implemented: false,
		description:
			"Zombies regenerate HP per second in combat. IMPLEMENT in combat tick.",
	},
	berserk: {
		label: "Berserk",
		unit: "%",
		range: [10, 30],
		implemented: false,
		description:
			"Damage scales with HP missing. IMPLEMENT per-unit damage calc.",
	},
	lastStand: {
		label: "Last Stand",
		unit: "%",
		range: [25, 60],
		implemented: false,
		description:
			"Massive bonus when squad drops below 20% units. IMPLEMENT in combat.",
	},

	// ── Wraith (Wraith slot) ───────────────────────────────────────
	wraithDamage: {
		label: "Wraith Damage",
		unit: "%",
		range: [5, 35],
		implemented: true,
		description: "Increases wraith damage.",
	},
	wraithSpeed: {
		label: "Wraith Speed",
		unit: "%",
		range: [5, 30],
		implemented: true,
		description: "Wraiths move faster.",
	},
	wraithHp: {
		label: "Wraith HP",
		unit: "%",
		range: [5, 25],
		implemented: true,
		description: "Increases wraith HP.",
	},
	soulOnKill: {
		label: "Soul on Kill",
		unit: "%",
		range: [5, 40],
		implemented: true,
		description: "Chance to gain a soul per enemy killed.",
	},
	spectralStrike: {
		label: "Spectral Strike",
		unit: "%",
		range: [3, 10],
		implemented: false,
		description:
			"Wraith damage scales with target HP%. IMPLEMENT per-unit damage calc.",
	},
};

export const SET_DEFS: Array<{
	id: string;
	glyph: string;
	name: string;
	pieces: string[];
	perks: { at: number; label: string }[];
}> = [];
