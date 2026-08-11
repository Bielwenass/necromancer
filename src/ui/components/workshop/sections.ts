import { UPGRADE_NODES } from "../../../game/data/upgrades";
import { canAffordCost } from "../../../game/resources";
import type { Resources, WorkshopState } from "../../../game/types";
import { upgradeCost } from "../../../game/upgrades";
import {
	CRYPT_CONFIG,
	cryptCost,
	GARDEN_PLOTS,
	gardenCost,
	gardenYield,
	UNIT_STAT_CONFIG,
	type UnitKey,
	unitStatCost,
} from "../../../game/workshopUpgrades";
import { IconSkeleton, IconWraith, IconZombie } from "../icons";
import { resMeta } from "./cost";
import type { WRow, WSection } from "./types";

/** A row is done when it has a ceiling and has reached it. */
export function isRowMaxed(row: WRow): boolean {
	return row.maxLevel !== undefined && row.level >= row.maxLevel;
}

/** Inscribed rows sink below everything still purchasable. */
function arrange(rows: WRow[]): WRow[] {
	return [...rows.filter((r) => !isRowMaxed(r)), ...rows.filter(isRowMaxed)];
}

/** Nodes whose prerequisites are unmet are omitted, not shown as locked. */
function skillRows(purchased: string[], branch: string): WRow[] {
	return UPGRADE_NODES.filter(
		(n) =>
			n.branch === branch &&
			(purchased.includes(n.id) ||
				n.prerequisites.every((p) => purchased.includes(p))),
	).map((n) => ({
		id: n.id,
		name: n.name,
		description: n.description,
		flavor: n.flavor,
		icon: n.icon,
		level: purchased.includes(n.id) ? 1 : 0,
		maxLevel: 1,
		kindLabel: "One-time Upgrade",
		buyLabel: () => "Inscribe",
		costFn: (lv) => (lv >= 1 ? null : upgradeCost(n)),
		valueFn: (lv) => (lv >= 1 ? "Inscribed" : "—"),
		nextFn: (lv) => (lv >= 1 ? "— maxed —" : n.description),
		skill: { upgradeId: n.id },
	}));
}

const UNIT_FLAVOR: Record<UnitKey, Record<"hp" | "dmg" | "speed", string>> = {
	skeleton: {
		hp: "Denser bone takes longer to break.",
		dmg: "Sharpened at the joint, swung without hesitation.",
		speed: "A lighter frame crosses the field sooner.",
	},
	zombie: {
		hp: "Rot is slow to notice a mortal wound.",
		dmg: "Dead weight, delivered.",
		speed: "Still shambling — but with purpose.",
	},
	wraith: {
		hp: "Little to strike, and less to hold.",
		dmg: "A touch that skips the armour entirely.",
		speed: "It does not cross the field so much as arrive.",
	},
};

function unitRows(
	unit: UnitKey,
	levels: { hp: number; dmg: number; speed: number },
): WRow[] {
	const cfg = UNIT_STAT_CONFIG[unit];
	return (["hp", "dmg", "speed"] as const).map((stat) => {
		const c = cfg[stat];
		const lv = levels[stat];
		return {
			id: `${unit}.${stat}`,
			name: `${unit.charAt(0).toUpperCase() + unit.slice(1)} ${c.label}`,
			description: `+${c.perLevel} ${c.label} per level (base ${c.base})`,
			flavor: UNIT_FLAVOR[unit][stat],
			icon: stat === "hp" ? "heal" : stat === "dmg" ? "aggro" : "fast",
			level: lv,
			costFn: () => unitStatCost(unit, stat, lv),
			valueFn: (l) => `${c.base + l * c.perLevel}`,
			nextFn: (l) => `${c.base + (l + 1) * c.perLevel}`,
		};
	});
}

function cryptRows(crypt: WorkshopState["crypt"]): WRow[] {
	return [
		{
			id: "crypt.squadSize",
			name: "Squad Capacity",
			icon: "army",
			description: CRYPT_CONFIG.squadSize.label,
			flavor: "Widen the circle, and more rise inside it.",
			level: crypt.squadSize,
			costFn: () => cryptCost("squadSize", crypt.squadSize),
			valueFn: (l) => `+${l}`,
			nextFn: (l) => `+${l + 1}`,
		},
		{
			id: "crypt.travelSpeed",
			name: "March Speed",
			icon: "retreat",
			description: CRYPT_CONFIG.travelSpeed.label,
			flavor: "The roads remember your banners, and shorten for them.",
			level: crypt.travelSpeed,
			costFn: () => cryptCost("travelSpeed", crypt.travelSpeed),
			valueFn: (l) => `+${l * 8}%`,
			nextFn: (l) => `+${(l + 1) * 8}%`,
		},
	];
}

const PLOT_FLAVOR: Record<string, string> = {
	bones: "Bone sown as seed corn: plant a little, reap a lot.",
	coins: "Grave-coin buys a wider trench, and wider trenches pay.",
	souls: "Nothing feeds soil like something that refuses to rest.",
	dust: "Relics ground fine make a grey and generous earth.",
	corpses: "Bury the flesh, harvest the frame beneath it.",
};

function gardenRows(garden: WorkshopState["garden"]): WRow[] {
	return GARDEN_PLOTS.map((plot) => {
		const meta = resMeta(plot.id);
		return {
			id: `garden.${plot.id}`,
			name: plot.name,
			description: `+${plot.baseYield} bones/sec per level · tended with ${meta.label.toLowerCase()}`,
			flavor: PLOT_FLAVOR[plot.id],
			icon: meta.icon,
			level: garden[plot.id],
			kindLabel: "Garden Plot",
			buyLabel: (l) => (l === 0 ? "Break Ground" : `Upgrade ➞ LV ${l + 1}`),
			costFn: (l) => gardenCost(plot.id, l),
			valueFn: (l) => `${gardenYield(plot.id, l).toFixed(2)}/s`,
			nextFn: (l) => `${gardenYield(plot.id, l + 1).toFixed(2)}/s`,
		};
	});
}

export function buildSections(
	purchased: string[],
	ws: WorkshopState,
	zombiesUnlocked: boolean,
	wraithsUnlocked: boolean,
): WSection[] {
	return [
		{
			id: "summoning",
			name: "Summoning",
			subtitle: "One-time summon enhancements.",
			icon: "army",
			unlocked: true,
			rows: arrange(skillRows(purchased, "summoning")),
		},
		{
			id: "command",
			name: "Command",
			subtitle: "One-time battlefield enhancements.",
			icon: "auto",
			unlocked: true,
			rows: arrange(skillRows(purchased, "command")),
		},
		{
			id: "necromancy",
			name: "Necromancy",
			subtitle: "One-time dark arts enhancements.",
			icon: "soul",
			unlocked: true,
			rows: arrange(skillRows(purchased, "necromancy")),
		},
		{
			id: "skeletons",
			name: "Skeletons",
			subtitle: "Leveled stat upgrades for skeletons.",
			icon: IconSkeleton,
			unlocked: true,
			rows: unitRows("skeleton", ws.skeleton),
		},
		{
			id: "zombies",
			name: "Zombies",
			subtitle: "Leveled stat upgrades for zombies.",
			icon: IconZombie,
			unlocked: zombiesUnlocked,
			lockedTitle: "Zombies Locked",
			lockedBody: "Unlock via Summoning branch.",
			rows: unitRows("zombie", ws.zombie),
		},
		{
			id: "wraiths",
			name: "Wraiths",
			subtitle: "Leveled stat upgrades for wraiths.",
			icon: IconWraith,
			unlocked: wraithsUnlocked,
			lockedTitle: "Wraiths Locked",
			lockedBody: "Unlock via Summoning branch.",
			rows: unitRows("wraith", ws.wraith),
		},
		{
			id: "crypt",
			name: "Crypt",
			subtitle: "Infinite upgrades for your crypt.",
			icon: "domain",
			unlocked: true,
			rows: cryptRows(ws.crypt),
		},
		{
			id: "garden",
			name: "Bone Garden",
			subtitle: "Every plot grows bone. Each is tended with its own resource.",
			icon: "aura",
			unlocked: true,
			rows: gardenRows(ws.garden),
		},
	];
}

/** Which side-nav entries have at least one affordable purchase right now. */
export function affordableDots(
	sections: WSection[],
	res: Resources,
): Record<string, boolean> {
	const dots: Record<string, boolean> = {};
	for (const s of sections) {
		dots[s.id] =
			s.unlocked &&
			s.rows.some((r) => {
				if (isRowMaxed(r)) return false;
				const cost = r.costFn(r.level);
				return cost !== null && canAffordCost(cost, res);
			});
	}
	return dots;
}
