import { UPGRADE_NODES } from "../../../game/data/upgrades";
import { canAffordCost } from "../../../game/resources";
import type { Resources, WorkshopState } from "../../../game/types";
import {
	CRYPT_CONFIG,
	cryptCost,
	GARDEN_BASE_YIELD,
	GARDEN_PLOT_NAMES,
	gardenCost,
	UNIT_STAT_CONFIG,
	type UnitKey,
	unitStatCost,
} from "../../../game/workshopUpgrades";
import { IconSkeleton, IconWraith, IconZombie } from "../icons";
import type { WRow, WSection } from "./types";

function skillRows(purchased: string[], branch: string): WRow[] {
	return UPGRADE_NODES.filter((n) => n.branch === branch).map((n) => ({
		id: n.id,
		name: n.name,
		description: n.description,
		flavor: n.flavor,
		icon: n.icon,
		level: purchased.includes(n.id) ? 1 : 0,
		maxLevel: 1,
		locked:
			!purchased.includes(n.id) &&
			n.prerequisites.some((p) => !purchased.includes(p)),
		unlockText:
			n.prerequisites.length > 0
				? `Requires: ${n.prerequisites
						.map((p) => UPGRADE_NODES.find((x) => x.id === p)?.name ?? p)
						.join(", ")}`
				: "",
		costFn: () => null,
		valueFn: (lv) => (lv >= 1 ? "Inscribed" : "—"),
		nextFn: (lv) => (lv >= 1 ? "— maxed —" : n.description),
		skill: { upgradeId: n.id, cost: n.cost },
	}));
}

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
			icon: stat === "hp" ? "heal" : stat === "dmg" ? "aggro" : "fast",
			level: lv,
			locked: false,
			unlockText: "",
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
			level: crypt.squadSize,
			locked: false,
			unlockText: "",
			flavor: "More bodies for the march.",
			costFn: () => cryptCost("squadSize", crypt.squadSize),
			valueFn: (l) => `+${l}`,
			nextFn: (l) => `+${l + 1}`,
		},
		{
			id: "crypt.travelSpeed",
			name: "March Speed",
			icon: "retreat",
			description: CRYPT_CONFIG.travelSpeed.label,
			level: crypt.travelSpeed,
			locked: false,
			unlockText: "",
			costFn: () => cryptCost("travelSpeed", crypt.travelSpeed),
			valueFn: (l) => `+${l * 8}%`,
			nextFn: (l) => `+${(l + 1) * 8}%`,
		},
	];
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
			rows: skillRows(purchased, "summoning"),
		},
		{
			id: "command",
			name: "Command",
			subtitle: "One-time battlefield enhancements.",
			icon: "auto",
			unlocked: true,
			rows: skillRows(purchased, "command"),
		},
		{
			id: "necromancy",
			name: "Necromancy",
			subtitle: "One-time dark arts enhancements.",
			icon: "soul",
			unlocked: true,
			rows: skillRows(purchased, "necromancy"),
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
			name: "Garden",
			subtitle: "Purchase and upgrade bone plots.",
			icon: "aura",
			unlocked: true,
			type: "garden",
			gardenLevels: ws.garden,
		},
	];
}

/** Which side-nav entries have at least one affordable purchase right now. */
export function affordableDots(
	sections: WSection[],
	res: Resources,
	pts: number,
): Record<string, boolean> {
	const dots: Record<string, boolean> = {};
	for (const s of sections) {
		if (!s.unlocked) {
			dots[s.id] = false;
		} else if (s.type === "garden") {
			dots[s.id] = (s.gardenLevels ?? []).some(
				(lv, i) =>
					canAffordCost(gardenCost(lv), res) && i < GARDEN_PLOT_NAMES.length,
			);
		} else {
			dots[s.id] = (s.rows ?? []).some((r) => {
				if (r.locked) return false;
				if (r.skill) return pts >= r.skill.cost && r.level === 0;
				const cost = r.costFn(r.level);
				return cost !== null && canAffordCost(cost, res);
			});
		}
	}
	return dots;
}

export function gardenTotalYield(garden: number[]): string {
	return (garden.reduce((s, l) => s + l, 0) * GARDEN_BASE_YIELD).toFixed(2);
}
