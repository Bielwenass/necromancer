import type { DungeonDef } from "../types";

/**
 * The dungeon ladder.
 *
 * Difficulty is `total enemy HP × total enemy DPS`, stepping ×1.8 per dungeon
 * within a tier and ×16 at each tier boundary. Roster shape moves the thresholds
 * too, so chaff rooms are scaled up and elite rooms down. One enemy blow must
 * stay well under a player unit's HP or the dungeon can never run unattended;
 * `balanceCheck` asserts it.
 *
 * Each tier is also a menu, steering a currency through a lever that exists:
 * corpses by roster shape, bones by `lootTable.bonesMin/Max`, souls by
 * `lootTable.soulChance`, banners by `travelTimeTicks`. Per tier the four rooms
 * are, in order: bones, corpses, banners, souls.
 */
export const DUNGEON_DEFS: Record<string, DungeonDef> = {
	// ══ TIER 1: skirmish scale. A handful of units. The first hour. ══

	"paupers-tomb": {
		id: "paupers-tomb",
		name: "Pauper's Tomb",
		tier: 1,
		enemies: [
			{
				name: "wretch",
				amount: 5,
				color: "#8B6B5D",
				stats: { hp: 32, dmg: 4, speed: 0.8 },
			},
		],
		lootTable: {
			bonesMin: 22,
			bonesMax: 45,
			soulChance: 0.02,
		},
		travelTimeTicks: 60,
		unlockCondition: [],
	},

	// Chaff: thirteen biters and a few wretches. The kill count makes it the
	// tier's corpse mine.
	"wolf-den": {
		id: "wolf-den",
		name: "Wolf Den",
		tier: 1,
		enemies: [
			{
				name: "biter",
				amount: 13,
				color: "#5A4A3A",
				stats: { hp: 15, dmg: 2, speed: 1.4 },
			},
			{
				name: "wretch",
				amount: 5,
				color: "#8B6B5D",
				stats: { hp: 29, dmg: 3, speed: 0.8 },
			},
		],
		lootTable: {
			bonesMin: 21,
			bonesMax: 39,
			soulChance: 0.02,
		},
		travelTimeTicks: 90,
		unlockCondition: [{ dungeonId: "paupers-tomb", count: 3 }],
	},

	// Half Wolf Den's bodies, each worth fearing, and the tier's richest bone
	// haul.
	"abandoned-chapel": {
		id: "abandoned-chapel",
		name: "Abandoned Chapel",
		tier: 1,
		enemies: [
			{
				name: "cultist",
				amount: 8,
				color: "#7A4C3C",
				stats: { hp: 36, dmg: 5, speed: 0.9 },
			},
			{
				name: "zealot",
				amount: 3,
				color: "#A86850",
				stats: { hp: 55, dmg: 7, speed: 1.1 },
			},
		],
		lootTable: {
			bonesMin: 60,
			bonesMax: 105,
			soulChance: 0.03,
		},
		travelTimeTicks: 140,
		unlockCondition: [{ dungeonId: "wolf-den", count: 3 }],
	},

	"hollow-keep": {
		id: "hollow-keep",
		name: "Hollow Keep",
		tier: 1,
		enemies: [
			{
				name: "wretch",
				amount: 12,
				color: "#8B6B5D",
				stats: { hp: 20, dmg: 3, speed: 0.8 },
			},
			{
				name: "alpha",
				amount: 6,
				color: "#5C4A30",
				stats: { hp: 36, dmg: 4, speed: 1.0 },
			},
			{
				name: "keep-captain",
				amount: 1,
				color: "#D14848",
				stats: { hp: 142, dmg: 9, speed: 0.8 },
			},
		],
		lootTable: {
			bonesMin: 45,
			bonesMax: 82,
			soulChance: 0.1,
		},
		travelTimeTicks: 180,
		unlockCondition: [{ dungeonId: "abandoned-chapel", count: 3 }],
	},

	// ══ TIER 2: company scale. Squads of ~30–70. The first day. ══

	// The short march: the tier's usual banners per clear, and by far the most of
	// them per hour.
	"watchers-spire": {
		id: "watchers-spire",
		name: "Watcher's Spire",
		tier: 2,
		enemies: [
			{
				name: "guard",
				amount: 26,
				color: "#607890",
				stats: { hp: 60, dmg: 7, speed: 0.9 },
			},
			{
				name: "warden",
				amount: 9,
				color: "#9ABCD8",
				stats: { hp: 96, dmg: 10, speed: 1.0 },
			},
		],
		lootTable: {
			bonesMin: 120,
			bonesMax: 210,
			soulChance: 0.04,
		},
		travelTimeTicks: 240,
		unlockCondition: [{ dungeonId: "hollow-keep", count: 1 }],
	},

	"sunken-chapel": {
		id: "sunken-chapel",
		name: "Sunken Chapel",
		tier: 2,
		enemies: [
			{
				name: "drowned",
				amount: 48,
				color: "#4F6B7A",
				stats: { hp: 63, dmg: 6, speed: 0.7 },
			},
			{
				name: "plague-zealot",
				amount: 12,
				color: "#6B8B5D",
				stats: { hp: 96, dmg: 13, speed: 0.9 },
			},
		],
		lootTable: {
			bonesMin: 135,
			bonesMax: 225,
			soulChance: 0.05,
		},
		travelTimeTicks: 400,
		unlockCondition: [{ dungeonId: "watchers-spire", count: 3 }],
	},

	"black-marsh": {
		id: "black-marsh",
		name: "Black Marsh",
		tier: 2,
		enemies: [
			{
				name: "fen-stalker",
				amount: 26,
				color: "#3D5040",
				stats: { hp: 79, dmg: 12, speed: 1.2 },
			},
			{
				name: "marsh-alpha",
				amount: 14,
				color: "#5A6B3D",
				stats: { hp: 167, dmg: 13, speed: 1.0 },
			},
		],
		lootTable: {
			bonesMin: 195,
			bonesMax: 315,
			soulChance: 0.16,
		},
		travelTimeTicks: 440,
		unlockCondition: [{ dungeonId: "watchers-spire", count: 3 }],
	},

	"whisper-wells": {
		id: "whisper-wells",
		name: "Whisper Wells",
		tier: 2,
		enemies: [
			{
				name: "guard",
				amount: 34,
				color: "#607890",
				stats: { hp: 70, dmg: 9, speed: 0.9 },
			},
			{
				name: "warden",
				amount: 22,
				color: "#9ABCD8",
				stats: { hp: 108, dmg: 13, speed: 1.0 },
			},
			{
				name: "well-captain",
				amount: 1,
				color: "#D14848",
				stats: { hp: 1400, dmg: 14, speed: 0.9 },
			},
		],
		lootTable: {
			bonesMin: 420,
			bonesMax: 690,
			soulChance: 0.07,
		},
		travelTimeTicks: 520,
		unlockCondition: [
			{ dungeonId: "sunken-chapel", count: 1 },
			{ dungeonId: "black-marsh", count: 1 },
		],
	},

	// ══ TIER 3: massed combat. Squads of ~100–300. Days two to four. ══

	"ossuary-of-vael": {
		id: "ossuary-of-vael",
		name: "Ossuary of Vael",
		tier: 3,
		enemies: [
			{
				name: "knight",
				amount: 85,
				color: "#7A8290",
				stats: { hp: 209, dmg: 15, speed: 0.9 },
			},
			{
				name: "spectre",
				amount: 34,
				color: "#B5D8E8",
				stats: { hp: 177, dmg: 19, speed: 1.4 },
			},
		],
		lootTable: {
			bonesMin: 1100,
			bonesMax: 1800,
			soulChance: 0.07,
		},
		travelTimeTicks: 620,
		unlockCondition: [{ dungeonId: "whisper-wells", count: 1 }],
	},

	"burning-reliquary": {
		id: "burning-reliquary",
		name: "Burning Reliquary",
		tier: 3,
		enemies: [
			{
				name: "inquisitor",
				amount: 165,
				color: "#F0773E",
				stats: { hp: 153, dmg: 15, speed: 1.2 },
			},
			{
				name: "knight",
				amount: 55,
				color: "#7A8290",
				stats: { hp: 278, dmg: 15, speed: 0.9 },
			},
		],
		lootTable: {
			bonesMin: 900,
			bonesMax: 1500,
			soulChance: 0.08,
		},
		travelTimeTicks: 780,
		unlockCondition: [{ dungeonId: "ossuary-of-vael", count: 3 }],
	},

	"sepulchre-of-kings": {
		id: "sepulchre-of-kings",
		name: "Sepulchre of Kings",
		tier: 3,
		enemies: [
			{
				name: "knight",
				amount: 78,
				color: "#7A8290",
				stats: { hp: 274, dmg: 24, speed: 0.9 },
			},
			{
				name: "high-warden",
				amount: 40,
				color: "#D9B872",
				stats: { hp: 454, dmg: 36, speed: 1.0 },
			},
			{
				name: "bone-titan",
				amount: 3,
				color: "#E8DCB5",
				stats: { hp: 1074, dmg: 52, speed: 0.7 },
			},
		],
		lootTable: {
			bonesMin: 1200,
			bonesMax: 2000,
			soulChance: 0.06,
		},
		travelTimeTicks: 420,
		unlockCondition: [{ dungeonId: "ossuary-of-vael", count: 3 }],
	},

	"citadel-of-ash": {
		id: "citadel-of-ash",
		name: "Citadel of Ash",
		tier: 3,
		enemies: [
			{
				name: "knight",
				amount: 72,
				color: "#7A8290",
				stats: { hp: 267, dmg: 22, speed: 0.9 },
			},
			{
				name: "inquisitor",
				amount: 58,
				color: "#F0773E",
				stats: { hp: 156, dmg: 20, speed: 1.2 },
			},
			{
				name: "high-warden",
				amount: 46,
				color: "#D9B872",
				stats: { hp: 445, dmg: 32, speed: 1.0 },
			},
			{
				name: "bone-titan",
				amount: 6,
				color: "#E8DCB5",
				stats: { hp: 1001, dmg: 47, speed: 0.7 },
			},
			{
				name: "saint-captain",
				amount: 1,
				color: "#F3E8A8",
				stats: { hp: 2669, dmg: 78, speed: 0.9 },
			},
		],
		lootTable: {
			bonesMin: 1700,
			bonesMax: 2800,
			soulChance: 0.24,
		},
		travelTimeTicks: 900,
		unlockCondition: [
			{ dungeonId: "burning-reliquary", count: 1 },
			{ dungeonId: "sepulchre-of-kings", count: 1 },
		],
	},

	// ══ TIER 4: hordes. Squads of ~300–700. The second week. ══

	"bone-cathedral": {
		id: "bone-cathedral",
		name: "Bone Cathedral",
		tier: 4,
		enemies: [
			{
				name: "paladin",
				amount: 215,
				color: "#E8DCB5",
				stats: { hp: 727, dmg: 34, speed: 1.0 },
			},
			{
				name: "arch-inquisitor",
				amount: 82,
				color: "#F0773E",
				stats: { hp: 509, dmg: 54, speed: 1.2 },
			},
			{
				name: "doom-knight",
				amount: 22,
				color: "#5C2E4A",
				stats: { hp: 1527, dmg: 42, speed: 0.9 },
			},
		],
		lootTable: {
			bonesMin: 9000,
			bonesMax: 15000,
			soulChance: 0.1,
		},
		travelTimeTicks: 1200,
		unlockCondition: [{ dungeonId: "citadel-of-ash", count: 1 }],
	},

	"throne-of-marrow": {
		id: "throne-of-marrow",
		name: "Throne of Marrow",
		tier: 4,
		enemies: [
			{
				name: "paladin",
				amount: 340,
				color: "#E8DCB5",
				stats: { hp: 561, dmg: 36, speed: 1.0 },
			},
			{
				name: "doom-knight",
				amount: 78,
				color: "#5C2E4A",
				stats: { hp: 1178, dmg: 45, speed: 0.9 },
			},
			{
				name: "seraph",
				amount: 14,
				color: "#F3E8A8",
				stats: { hp: 2019, dmg: 73, speed: 1.3 },
			},
		],
		lootTable: {
			bonesMin: 8000,
			bonesMax: 13000,
			soulChance: 0.1,
		},
		travelTimeTicks: 1600,
		unlockCondition: [{ dungeonId: "bone-cathedral", count: 3 }],
	},

	// The elite room of the last tier, and the shortest march in it. Its stats sit
	// below its ladder slot on purpose: heavy enemies raise both thresholds for
	// the same HP×DPS.
	"ashen-vigil": {
		id: "ashen-vigil",
		name: "Ashen Vigil",
		tier: 4,
		enemies: [
			{
				name: "doom-knight",
				amount: 135,
				color: "#5C2E4A",
				stats: { hp: 978, dmg: 56, speed: 0.9 },
			},
			{
				name: "seraph",
				amount: 68,
				color: "#F3E8A8",
				stats: { hp: 1677, dmg: 89, speed: 1.3 },
			},
			{
				name: "ash-king",
				amount: 2,
				color: "#8C2E2E",
				stats: { hp: 4191, dmg: 134, speed: 0.8 },
			},
		],
		lootTable: {
			bonesMin: 11000,
			bonesMax: 18000,
			soulChance: 0.12,
		},
		travelTimeTicks: 800,
		unlockCondition: [{ dungeonId: "throne-of-marrow", count: 3 }],
	},

	"final-mausoleum": {
		id: "final-mausoleum",
		name: "The Final Mausoleum",
		tier: 4,
		enemies: [
			{
				name: "paladin",
				amount: 300,
				color: "#E8DCB5",
				stats: { hp: 612, dmg: 48, speed: 1.0 },
			},
			{
				name: "doom-knight",
				amount: 155,
				color: "#5C2E4A",
				stats: { hp: 1285, dmg: 60, speed: 0.9 },
			},
			{
				name: "seraph",
				amount: 62,
				color: "#F3E8A8",
				stats: { hp: 2202, dmg: 96, speed: 1.3 },
			},
			{
				name: "ash-king",
				amount: 4,
				color: "#8C2E2E",
				stats: { hp: 5506, dmg: 144, speed: 0.8 },
			},
			{
				name: "the-final",
				amount: 1,
				color: "#FFFFFF",
				stats: { hp: 18353, dmg: 216, speed: 0.6 },
			},
		],
		lootTable: {
			bonesMin: 18000,
			bonesMax: 30000,
			soulChance: 0.4,
		},
		travelTimeTicks: 1900,
		unlockCondition: [{ dungeonId: "ashen-vigil", count: 1 }],
	},
};
