import type { UpgradeNode } from "../types";

/**
 * The upgrade tree: three branches, six tiers, one capstone each. Summoning is
 * what you field, command is how they campaign, necromancy is what you reap and
 * bind.
 *
 * Two rules keep the ordering honest:
 *
 * 1. An amplifier never precedes its enabler. A node scaling corpses, souls, or
 *    a unit type sits downstream of the node that opens it, in the same branch.
 * 2. A cross-branch dependency is priced through `cost`, since `sections.ts`
 *    hides a node whose prerequisites are unmet. Zombie Rites charges corpses,
 *    so its price says what is missing.
 *
 * Costs climb roughly threefold per tier. Banners are the spine; a node reaching
 * for another branch's economy charges that resource on top.
 *
 * `pctOfSelf` is unusable here: `recomputeDerived` folds upgrades first and in
 * purchase order, so a share of a running total would depend on both.
 */
export const UPGRADE_NODES: UpgradeNode[] = [
	// ══ SUMMONING ══
	// The army. Splits at s1 into a circle line (size, count) and a bone line
	// (skeletons, then the two unit unlocks hanging off it).

	{
		id: "s1",
		branch: "summoning",
		name: "Wider Circles",
		tier: 1,
		cost: { banners: 5 },
		effects: [{ kind: "global", stat: "maxSquadSize", op: "add", value: 2 }],
		flavor: "Chalk a broader ring, and more of them answer inside it.",
		prerequisites: [],
		icon: "army",
	},
	{
		id: "s2",
		branch: "summoning",
		name: "Practised Rite",
		tier: 1,
		cost: { banners: 9 },
		effects: [
			{ kind: "global", stat: "summonCostBonus", op: "add", value: 0.2 },
		],
		flavor: "A rite performed a thousand times wastes very little of the bone.",
		prerequisites: ["s1"],
		icon: "fast",
	},
	{
		id: "s3",
		branch: "summoning",
		name: "Marrow Craft",
		tier: 1,
		cost: { banners: 14 },
		effects: [
			{ kind: "unit", units: ["skeleton"], stat: "dmgBonus", value: 0.15 },
			{ kind: "unit", units: ["skeleton"], stat: "hpBonus", value: 0.1 },
		],
		flavor: "Bone packed dense at the joint. It takes an edge, and it holds.",
		prerequisites: ["s1"],
		icon: "bone",
	},
	{
		id: "s4",
		branch: "summoning",
		name: "Zombie Rites",
		tier: 2,
		cost: { banners: 42, corpses: 25 },
		effects: [{ kind: "flag", flag: "zombiesUnlocked" }],
		description: "Slow, and hard to put back down. Summoned with corpses.",
		flavor: "Flesh still clinging to the bone is flesh you have not yet spent.",
		prerequisites: ["s3"],
		icon: "zombie",
	},
	{
		id: "s5",
		branch: "summoning",
		name: "Second Circle",
		tier: 2,
		cost: { banners: 63 },
		effects: [{ kind: "global", stat: "maxSquads", op: "add", value: 1 }],
		flavor:
			"A second ring, a second warband, and no more of your attention than the first asked for.",
		prerequisites: ["s2"],
		icon: "circle",
	},
	{
		id: "s6",
		branch: "summoning",
		name: "Grave-Fat",
		tier: 3,
		cost: { banners: 132 },
		effects: [
			{ kind: "unit", units: ["zombie"], stat: "hpBonus", value: 0.25 },
			{ kind: "unit", units: ["zombie"], stat: "dmgBonus", value: 0.1 },
		],
		flavor: "Rot is slow to admit that a wound was ever fatal.",
		prerequisites: ["s4"],
		icon: "plague",
	},
	{
		id: "s7",
		branch: "summoning",
		name: "Mass Graves",
		tier: 3,
		cost: { banners: 165 },
		effects: [{ kind: "global", stat: "maxSquadSize", op: "add", value: 5 }],
		flavor: "Every pauper's pit for a day's ride, emptied on one breath.",
		prerequisites: ["s5"],
		icon: "mass",
	},
	{
		id: "s8",
		branch: "summoning",
		name: "Brittle Host",
		tier: 3,
		cost: { banners: 198 },
		// Purely positive: a tree node is bought once and never taken off, so a
		// drawback here is a trap.
		effects: [
			{ kind: "unit", units: ["skeleton"], stat: "dmgBonus", value: 0.3 },
		],
		description: "Inscribed for good — there is no unlearning it.",
		flavor:
			"Ground thin at the shaft and honed at the edge. Every stroke lands like the last one they will ever throw.",
		prerequisites: ["s3"],
		icon: "aggro",
	},
	{
		id: "s9",
		branch: "summoning",
		name: "Wraith Rites",
		tier: 3,
		cost: { banners: 220, souls: 5 },
		effects: [{ kind: "flag", flag: "wraithsUnlocked" }],
		description:
			"Undying: they reform after a battle, won or lost. Summoned with souls.",
		flavor:
			"Not every soul consents to leave. Cut one apart and it takes only a moment to gather itself.",
		prerequisites: ["s6"],
		icon: "wraith",
	},
	{
		id: "s10",
		branch: "summoning",
		name: "Reanimation",
		tier: 4,
		cost: { banners: 451 },
		effects: [
			{ kind: "global", stat: "reanimateChance", op: "add", value: 0.15 },
		],
		description: "Rolled per unit lost, and never past the squad's size limit.",
		flavor: "What falls in your name has a habit of getting back up.",
		prerequisites: ["s7"],
		icon: "reanim",
	},
	{
		id: "s11",
		branch: "summoning",
		name: "Untethered",
		tier: 4,
		cost: { banners: 420 },
		effects: [
			{ kind: "unit", units: ["wraith"], stat: "dmgBonus", value: 0.2 },
			{ kind: "unit", units: ["wraith"], stat: "speedBonus", value: 0.15 },
		],
		flavor:
			"Loosen the last knot and it stops crossing the field at all. It simply arrives.",
		prerequisites: ["s9"],
		icon: "drain",
	},
	{
		id: "s12",
		branch: "summoning",
		name: "Endless March",
		tier: 5,
		cost: { banners: 1320 },
		effects: [
			{ kind: "global", stat: "maxSquads", op: "add", value: 1 },
			{ kind: "global", stat: "maxSquadSize", op: "add", value: 8 },
		],
		flavor: "No halt, no camp, and no hours lost to burying anybody.",
		prerequisites: ["s10", "s11"],
		icon: "triple",
	},
	{
		id: "s13",
		branch: "summoning",
		name: "Crypt Lord",
		tier: 6,
		cost: { banners: 3750 },
		effects: [
			{ kind: "global", stat: "maxSquadSize", op: "add", value: 15 },
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "hpBonus",
				value: 0.25,
			},
		],
		flavor:
			"The crypt has stopped being somewhere you keep things and started being something you are.",
		prerequisites: ["s12"],
		icon: "knight",
		capstone: true,
	},

	// ══ COMMAND ══
	// The campaign. A logistics line (march, payout, a third circle) and a war
	// line (stats, tactics, the enemy debuffs) meeting at War Cry.

	{
		id: "c1",
		branch: "command",
		name: "Standing Orders",
		tier: 1,
		cost: { banners: 6 },
		effects: [{ kind: "flag", flag: "autoDeploy" }],
		description:
			"Idle squads march back to their last target the moment they get home.",
		flavor:
			"The dead remember the road out as well as they remember the way back.",
		prerequisites: [],
		icon: "auto",
	},
	{
		id: "c2",
		branch: "command",
		name: "Forced March",
		tier: 1,
		cost: { banners: 10 },
		effects: [
			{ kind: "global", stat: "squadTravelSpeedBonus", op: "add", value: 0.3 },
		],
		flavor: "Nothing in the column tires, so nothing in the column stops.",
		prerequisites: ["c1"],
		icon: "retreat",
	},
	{
		id: "c3",
		branch: "command",
		name: "Drilled Ranks",
		tier: 1,
		cost: { banners: 13 },
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "hpBonus",
				value: 0.1,
			},
		],
		flavor: "Drilled until the line holds with nobody alive left to hold it.",
		prerequisites: ["c1"],
		icon: "heal",
	},
	{
		id: "c4",
		branch: "command",
		name: "Reckless Advance",
		tier: 2,
		cost: { banners: 48 },
		// See `s8`: trade-offs live on relics, where they can be taken off.
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "dmgBonus",
				value: 0.18,
			},
		],
		description: "A standing order.",
		flavor: "Bone is cheap. The hour spent waiting on a safer opening is not.",
		prerequisites: ["c3"],
		icon: "aggro",
	},
	{
		id: "c5",
		branch: "command",
		name: "Spoils of War",
		tier: 2,
		cost: { banners: 57 },
		effects: [
			{ kind: "global", stat: "bannerChanceBonus", op: "add", value: 0.25 },
		],
		flavor:
			"Every tomb keeps one thing worth carrying at the head of the column.",
		prerequisites: ["c2"],
		icon: "cry",
	},
	{
		id: "c6",
		branch: "command",
		name: "Tomb Cartography",
		tier: 3,
		cost: { banners: 154 },
		effects: [
			{ kind: "global", stat: "clearMultBonus", op: "add", value: 0.5 },
		],
		description:
			"Steepens the repeat-clear curve, so it pays nothing on a dungeon's first run.",
		flavor:
			"The second visit is always the richer one. You know which stones lift.",
		prerequisites: ["c5"],
		icon: "tactics",
	},
	{
		id: "c7",
		branch: "command",
		name: "Sharpened Rites",
		tier: 3,
		cost: { banners: 143 },
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "dmgBonus",
				value: 0.15,
			},
		],
		flavor:
			"You have stopped asking them to fight and started telling them how.",
		prerequisites: ["c3"],
		icon: "target",
	},
	{
		id: "c8",
		branch: "command",
		name: "Group Tactics",
		tier: 4,
		cost: { banners: 399 },
		effects: [
			{ kind: "global", stat: "groupTacticsBonus", op: "add", value: 0.2 },
		],
		description:
			"Paid only while a squad fields bone, flesh and shade at once — worth nothing until wraiths march.",
		flavor: "Each of the three covers the flank the other two leave open.",
		prerequisites: ["c7"],
		icon: "synergy",
	},
	{
		id: "c9",
		branch: "command",
		name: "Third Circle",
		tier: 4,
		cost: { banners: 472 },
		effects: [{ kind: "global", stat: "maxSquads", op: "add", value: 1 }],
		flavor:
			"Three valleys emptied at once, and none of them warned the others.",
		prerequisites: ["c6"],
		icon: "circle",
	},
	{
		id: "c10",
		branch: "command",
		name: "Terror Tactics",
		tier: 4,
		cost: { banners: 504 },
		effects: [
			{ kind: "global", stat: "enemyHpPenalty", op: "add", value: 0.1 },
			{ kind: "global", stat: "enemyDmgPenalty", op: "add", value: 0.15 },
		],
		flavor:
			"Half of what guards a tomb stops guarding it the moment your banner clears the treeline.",
		prerequisites: ["c8"],
		icon: "forbid",
	},
	{
		id: "c11",
		branch: "command",
		name: "War Cry",
		tier: 5,
		cost: { banners: 1380 },
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "dmgBonus",
				value: 0.15,
			},
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "hpBonus",
				value: 0.15,
			},
		],
		flavor: "One shout, and every tomb in the valley answers it.",
		prerequisites: ["c9", "c10"],
		icon: "drum",
	},
	{
		id: "c12",
		branch: "command",
		name: "Necrotic Command",
		tier: 6,
		cost: { banners: 3750 },
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "dmgBonus",
				value: 0.3,
			},
			{ kind: "global", stat: "maxSquads", op: "add", value: 1 },
		],
		flavor:
			"You no longer give orders. You decide, and the field is found to agree.",
		prerequisites: ["c11"],
		icon: "lich",
		capstone: true,
	},

	// ══ NECROMANCY ══
	// The arts. A yield line (corpses, then souls, each followed by its own
	// amplifiers) and a reliquary line (five slots), meeting at the capstone.
	// Choosing between them is the branch's whole point.

	{
		id: "n1",
		branch: "necromancy",
		name: "Bone Garden",
		tier: 1,
		cost: { banners: 7 },
		effects: [
			{ kind: "global", stat: "bonesPassiveMult", op: "mult", value: 1.25 },
		],
		flavor: "Bone sown as seed corn. Plant a little, and reap without a spade.",
		prerequisites: [],
		icon: "surge",
	},
	{
		id: "n2",
		branch: "necromancy",
		name: "Grave Harvest",
		tier: 1,
		cost: { banners: 16 },
		effects: [{ kind: "flag", flag: "corpsesUnlocked" }],
		flavor:
			"Until now your warbands left the bodies where they fell. A waste, and you have stopped permitting it.",
		prerequisites: ["n1"],
		icon: "rez",
	},
	{
		id: "n3",
		branch: "necromancy",
		name: "Bound Bone",
		tier: 2,
		cost: { banners: 36 },
		effects: [{ kind: "slot", slot: "I2" }],
		flavor: "A second anchor scratched into the rim of the skeleton circle.",
		prerequisites: ["n1"],
		icon: "bone",
	},
	{
		id: "n4",
		branch: "necromancy",
		name: "Charnel Yield",
		tier: 2,
		cost: { banners: 52 },
		effects: [
			{ kind: "global", stat: "corpseYieldBonus", op: "add", value: 0.25 },
			{ kind: "global", stat: "boneYieldBonus", op: "add", value: 0.2 },
		],
		flavor: "Nothing leaves a tomb that you have not first weighed.",
		prerequisites: ["n2"],
		icon: "plague",
	},
	{
		id: "n5",
		branch: "necromancy",
		name: "Soul Snare",
		tier: 2,
		cost: { banners: 74 },
		effects: [{ kind: "flag", flag: "soulsUnlocked" }],
		flavor:
			"A wire of cold intent strung across the tomb mouth. What leaves a body on its way out does not get past it.",
		prerequisites: ["n2"],
		icon: "soul",
	},
	{
		id: "n6",
		branch: "necromancy",
		name: "Reliquary Niche",
		tier: 3,
		cost: { banners: 138 },
		effects: [{ kind: "slot", slot: "C2" }],
		flavor:
			"You cut a second alcove into the crypt wall. Something is already in it.",
		prerequisites: ["n3"],
		icon: "domain",
	},
	{
		id: "n7",
		branch: "necromancy",
		name: "Soul Harvest",
		tier: 3,
		cost: { banners: 127 },
		effects: [
			{ kind: "global", stat: "soulHarvestBonus", op: "add", value: 0.2 },
		],
		flavor:
			"You have learned the trick of catching what leaves the body on its way out.",
		prerequisites: ["n5"],
		icon: "drain",
	},
	{
		id: "n8",
		branch: "necromancy",
		name: "Rotting Vessel",
		tier: 3,
		cost: { banners: 165, corpses: 15 },
		effects: [{ kind: "slot", slot: "II2" }],
		flavor:
			"The zombie circle will hold a second charm, provided you seal it in wax first.",
		prerequisites: ["n6"],
		icon: "zombie",
	},
	{
		id: "n9",
		branch: "necromancy",
		name: "Soul Drain",
		tier: 4,
		cost: { banners: 420 },
		effects: [
			{ kind: "global", stat: "soulHarvestBonus", op: "add", value: 0.2 },
			{ kind: "global", stat: "soulsYieldBonus", op: "add", value: 0.3 },
		],
		flavor: "The deeper the tomb, the looser its souls sit in it.",
		prerequisites: ["n7"],
		icon: "vamp",
	},
	{
		id: "n10",
		branch: "necromancy",
		name: "Veiled Circle",
		tier: 4,
		cost: { banners: 441, souls: 4 },
		effects: [{ kind: "slot", slot: "III2" }],
		flavor:
			"A wraith will not hold still for one binding, let alone two. You insist.",
		prerequisites: ["n8"],
		icon: "wraith",
	},
	{
		id: "n11",
		branch: "necromancy",
		name: "Phylactery",
		tier: 4,
		cost: { banners: 504 },
		effects: [{ kind: "flag", flag: "phylactery" }],
		description: "Charges bank up to a cap while you are away.",
		flavor: "The vessel fills itself again by dawn and asks you for nothing.",
		prerequisites: ["n9"],
		icon: "phyl",
	},
	{
		id: "n12",
		branch: "necromancy",
		name: "Ossuary Vault",
		tier: 5,
		cost: { banners: 1200 },
		effects: [{ kind: "slot", slot: "C3" }],
		flavor:
			"Far enough under the crypt that whatever you shelve there stays shelved.",
		prerequisites: ["n10"],
		icon: "forbid",
	},
	{
		id: "n13",
		branch: "necromancy",
		name: "Dark Pact",
		tier: 5,
		cost: { banners: 1380 },
		effects: [{ kind: "global", stat: "pityReduction", op: "add", value: 0.3 }],
		description: "Every Ritual pool reaches its guarantee sooner.",
		flavor:
			"Something older curates your relics now. It has not yet named its price.",
		prerequisites: ["n11"],
		icon: "pact",
	},
	{
		id: "n14",
		branch: "necromancy",
		name: "Apotheosis",
		tier: 6,
		cost: { banners: 4050 },
		effects: [
			{ kind: "global", stat: "bonesPassiveMult", op: "mult", value: 2 },
			{ kind: "global", stat: "boneYieldBonus", op: "add", value: 0.25 },
			{ kind: "global", stat: "soulsYieldBonus", op: "add", value: 0.25 },
			{ kind: "global", stat: "corpseYieldBonus", op: "add", value: 0.25 },
		],
		flavor:
			"You are no longer the one performing the rite. You are what it is performed upon.",
		prerequisites: ["n12", "n13"],
		icon: "apoth",
		capstone: true,
	},

	// ══ THE ENDLESS RITE ══
	// The board above is finite and a long run outlasts it, so the tree ends in a
	// rite that can always be performed once more at a steeper price.
	{
		id: "x1",
		branch: "necromancy",
		name: "The Endless Rite",
		tier: 6,
		cost: { banners: 1200 },
		repeatGrowth: 1.35,
		effects: [
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "hpBonus",
				value: 0.06,
			},
			{
				kind: "unit",
				units: ["skeleton", "zombie", "wraith"],
				stat: "dmgBonus",
				value: 0.06,
			},
		],
		description: "It can always be performed once more.",
		flavor:
			"There is no final verse. There is only the next one, and the price of saying it.",
		prerequisites: ["n14"],
		icon: "apoth",
	},
];
