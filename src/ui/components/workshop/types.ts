import type { ComponentType } from "react";
import type { Resources } from "../../../game/types";

/** A single purchasable line in a workshop section. */
export interface WRow {
	id: string;
	name: string;
	description: string;
	flavor?: string;
	icon: string;
	level: number;
	maxLevel?: number;
	locked: boolean;
	unlockText: string;
	/** `null` when the row can't be bought with resources (maxed, or skill-point priced). */
	costFn: (level: number) => Partial<Resources> | null;
	valueFn: (level: number) => string;
	nextFn: (level: number) => string;
	/** Present only on upgrade-tree rows, which cost skill points instead of resources. */
	skill?: { upgradeId: string; cost: number };
}

/** One entry in the side nav, and the pane it renders. */
export interface WSection {
	id: string;
	name: string;
	subtitle: string;
	icon: string | ComponentType;
	unlocked: boolean;
	lockedTitle?: string;
	lockedBody?: string;
	type?: "garden";
	rows?: WRow[];
	gardenLevels?: number[];
}
