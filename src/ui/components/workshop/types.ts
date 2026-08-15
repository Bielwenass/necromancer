import type { ComponentType } from "react";
import type { Resources } from "../../../game/types";
import type { IconComponent } from "../icons/IconProps";

/**
 * A single purchasable line. Every workshop section (skill branches, unit stats,
 * crypt, garden) is a list of these, so one row and one detail body render all
 * of them. Rows the player can't act on are dropped while the section is built,
 * so nothing here describes a locked state.
 */
export interface WorkshopRow {
	id: string;
	name: string;
	description: string;
	flavor?: string;
	icon: string | IconComponent;
	level: number;
	maxLevel?: number;
	/** `null` when there is nothing left to buy; every live row has a price. */
	costFn: (level: number) => Partial<Resources> | null;
	valueFn: (level: number) => string;
	nextFn: (level: number) => string;
	kindLabel?: string;
	buyLabel?: (level: number) => string;
	/**
	 * Present only on upgrade-tree rows, naming the store action that buys them.
	 * The tree tracks purchases as ids while the rest of the Workshop tracks
	 * levels.
	 */
	skill?: { upgradeId: string };
}

export interface WorkshopSection {
	id: string;
	name: string;
	subtitle: string;
	icon: string | ComponentType;
	unlocked: boolean;
	rows: WorkshopRow[];
}
